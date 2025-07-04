import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
} from "~app/utils/validation";
import { createContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { UUID_REGEX } from "~web/handlers/validation";
import { getResHeaders } from "~web/utils/headers";

import { procedure } from "./register";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.register", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "invalid@@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
							name: "a".repeat(MIN_USERNAME_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		describe("password", () => {
			test("minimal length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
							name: "a".repeat(MIN_USERNAME_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
							name: "a".repeat(MIN_USERNAME_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		describe("name", () => {
			test("minimal length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
							name: "a".repeat(MIN_USERNAME_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Minimal length for user name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const caller = createCaller(await createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
							name: "a".repeat(MAX_USERNAME_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Maximum length for user name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});

		test("email already exist", async ({ ctx }) => {
			const caller = createCaller(await createContext(ctx));
			const {
				account: { email: existingEmail },
			} = await insertAccountWithSession(ctx);
			await expectTRPCError(
				() =>
					caller.procedure({
						email: existingEmail,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
						name: "a".repeat(MIN_USERNAME_LENGTH),
					}),
				"CONFLICT",
				`Email "${existingEmail}" already exists.`,
			);
		});
	});

	describe("functionality", () => {
		test("register successful", async ({ ctx }) => {
			ctx.emailOptions.active = false;
			const context = await createContext(ctx);
			const caller = createCaller(context);
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					email: faker.internet.email(),
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(result.account.id).toMatch(UUID_REGEX);
			expect(result).toEqual<typeof result>({
				account: { id: result.account.id },
			});
			const responseHeaders = getResHeaders(context);
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			assert(
				setCookieTuple,
				"Header 'set-cookie' has to be set in the response",
			);
			const tokenMatch = /authToken=([^;]+)/.exec(setCookieTuple[1].toString());
			assert(tokenMatch, "Cookie 'authToken' should be present");
			const token = tokenMatch[1];
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${token}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});

		test("email sent if active", async ({ ctx }) => {
			const email = faker.internet.email();
			const caller = createCaller(await createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					email,
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(1);
			const message = ctx.emailOptions.mock.getMessages()[0];
			assert(message);
			expect(message).toStrictEqual<typeof message>({
				address: email.toLowerCase(),
				body: message.body,
				subject: "Confirm email in Receipt App",
			});
			expect(message.body).toMatchSnapshot();
		});

		test("email reports error if broken", async ({ ctx }) => {
			ctx.emailOptions.broken = true;
			const context = await createContext(ctx);
			const caller = createCaller(context);
			await expectTRPCError(
				() =>
					caller.procedure({
						email: faker.internet.email(),
						password: faker.internet.password(),
						name: faker.person.firstName(),
					}),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});
	});
});
