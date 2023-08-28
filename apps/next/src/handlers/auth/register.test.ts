import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import {
	MAX_PASSWORD_LENGTH,
	MAX_USERNAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
} from "app/utils/validation";
import { router } from "next-app/handlers/index";
import { UUID_REGEX } from "next-app/handlers/validation";
import { createContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("auth.register", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.auth.register({
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
						caller.auth.register({
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
						caller.auth.register({
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
						caller.auth.register({
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
						caller.auth.register({
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
					caller.auth.register({
						email: existingEmail,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
						name: "a".repeat(MIN_USERNAME_LENGTH),
					}),
				"CONFLICT",
				"Email already exist",
			);
		});
	});

	describe("functionality", () => {
		test("register successful", async ({ ctx }) => {
			ctx.emailOptions.active = false;
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			await expectDatabaseDiffSnapshot(ctx, async () => {
				const result = await caller.auth.register({
					email: faker.internet.email(),
					password: faker.internet.password(),
					name: faker.person.firstName(),
				});
				expect(result.account.id).toMatch(UUID_REGEX);
				expect(result).toEqual<typeof result>({
					account: { id: result.account.id },
				});
			});
			expect(context.setHeaders).toMatchSnapshot();
		});

		test("email sent if active", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, () =>
				caller.auth.register({
					email: faker.internet.email(),
					password: faker.internet.password(),
					name: faker.person.firstName(),
				}),
			);
			expect(ctx.emailOptions.cachedMessages).toHaveLength(1);
			expect(ctx.emailOptions.cachedMessages![0]).toMatchSnapshot();
		});

		test("email reports error if broken", async ({ ctx }) => {
			ctx.emailOptions.broken = true;
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			await expectTRPCError(
				() =>
					caller.auth.register({
						email: faker.internet.email(),
						password: faker.internet.password(),
						name: faker.person.firstName(),
					}),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.cachedMessages).toHaveLength(0);
		});
	});
});
