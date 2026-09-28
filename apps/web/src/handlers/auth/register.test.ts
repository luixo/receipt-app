import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
} from "~app/utils/validation";
import { createContext } from "~tests/backend/utils/context";
import { insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";
import { UUID_REGEX } from "~web/handlers/validation";

import { procedure } from "./register";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("auth.register", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = createCaller(createContext(ctx));
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
				const caller = createCaller(createContext(ctx));
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
				const caller = createCaller(createContext(ctx));
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
				const caller = createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
							name: "a".repeat(MIN_USERNAME_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Minimal length for peer name is ${MIN_USERNAME_LENGTH}`,
				);
			});

			test("maximum length", async ({ ctx }) => {
				const caller = createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "valid@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
							name: "a".repeat(MAX_USERNAME_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "name": Maximum length for peer name is ${MAX_USERNAME_LENGTH}`,
				);
			});
		});

		test("email already exist", async ({ ctx }) => {
			const caller = createCaller(createContext(ctx));
			const {
				user: { email: existingEmail },
			} = await insertUserWithSession(ctx);
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
			ctx.emailOptions.setActive(false);
			const context = createContext(ctx);
			const caller = createCaller(context);
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					email: faker.internet.email(),
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(result.user.id).toMatch(UUID_REGEX);
			expect(result).toStrictEqual<typeof result>({
				user: { id: result.user.id, verified: true },
			});
			const responseHeaders = [...context.resHeaders.entries()];
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			assert(
				setCookieTuple,
				"Header 'set-cookie' has to be set in the response",
			);
			const tokenMatch = /better-auth\.session_token=(?<token>[^;]+)/.exec(
				setCookieTuple[1],
			);
			assert(
				tokenMatch,
				"Cookie 'better-auth.session_token' should be present",
			);
			const [, token] = tokenMatch;
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`better-auth.session_token=${token}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`,
				],
			]);
		});

		test("email sent if active", async ({ ctx }) => {
			const email = faker.internet.email();
			const caller = createCaller(createContext(ctx));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					email,
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(result.user.verified).toStrictEqual(false);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(1);
			const [message] = ctx.emailOptions.mock.getMessages();
			assert(message);
			expect(message).toStrictEqual<typeof message>({
				address: email.toLowerCase(),
				body: message.body,
				subject: "Confirm email in Receipt App",
			});
			expect(message.body).toMatchSnapshot();
		});

		test("registration succeeds even if email is broken", async ({ ctx }) => {
			ctx.emailOptions.setBroken(true);
			const context = createContext(ctx);
			const caller = createCaller(context);
			const result = await caller.procedure({
				email: faker.internet.email(),
				password: "a".repeat(MIN_PASSWORD_LENGTH),
				name: faker.person.firstName(),
			});
			expect(result.user.verified).toBe(false);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});
	});
});
