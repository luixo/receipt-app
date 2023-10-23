import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createContext } from "@tests/backend/utils/context";
import { insertAccountWithSession } from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import {
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
} from "app/utils/validation";
import { t } from "next-app/handlers/trpc";
import { UUID_REGEX } from "next-app/handlers/validation";

import { procedure } from "./register";

const router = t.router({ procedure });

describe("auth.register", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
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
				const caller = router.createCaller(createContext(ctx));
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
				const caller = router.createCaller(createContext(ctx));
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
				const caller = router.createCaller(createContext(ctx));
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
				const caller = router.createCaller(createContext(ctx));
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
			const caller = router.createCaller(createContext(ctx));
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
			const caller = router.createCaller(createContext(ctx));
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
			const responseHeaders = ctx.responseHeaders.get();
			const setCookieTuple = responseHeaders.find(
				([key]) => key === "set-cookie",
			);
			expect(setCookieTuple).toBeTruthy();
			const tokenMatch = setCookieTuple![1]!
				.toString()
				.match(/authToken=([^;]+)/);
			expect(tokenMatch).toBeTruthy();
			const token = tokenMatch![1]!;
			expect(responseHeaders).toStrictEqual<typeof responseHeaders>([
				[
					"set-cookie",
					`authToken=${token}; Path=/; Expires=Fri, 31 Jan 2020 00:00:00 GMT; HttpOnly; SameSite=Strict`,
				],
			]);
		});

		test("email sent if active", async ({ ctx }) => {
			const email = faker.internet.email();
			const caller = router.createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure({
					email,
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(1);
			const message = ctx.emailOptions.mock.getMessages()[0]!;
			expect(message).toStrictEqual<typeof message>({
				address: email.toLowerCase(),
				body: message.body,
				subject: "Confirm email in Receipt App",
			});
			expect(message.body).toMatchSnapshot();
		});

		test("email reports error if broken", async ({ ctx }) => {
			ctx.emailOptions.broken = true;
			const context = createContext(ctx);
			const caller = router.createCaller(context);
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
