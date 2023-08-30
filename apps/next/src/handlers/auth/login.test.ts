import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "app/utils/validation";
import { t } from "next-app/handlers/trpc";
import { createContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./login";

const router = t.router({ procedure });

describe("auth.login", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							email: "invalid@@mail.org",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
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
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		test("account not found", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const email = faker.internet.email();
			await expectTRPCError(
				() =>
					caller.procedure({
						email,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"UNAUTHORIZED",
				`Authentication of account "${email}" failed: account not found.`,
			);
		});

		test("authentication failed", async ({ ctx }) => {
			const {
				account: { email, password },
			} = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createContext(ctx));
			await expectTRPCError(
				() =>
					caller.procedure({
						email,
						password: `${password}_fail`,
					}),
				"UNAUTHORIZED",
				`Authentication of account "${email}" failed: password is wrong.`,
			);
		});
	});

	describe("functionality", () => {
		test("login successful", async ({ ctx }) => {
			const {
				accountId,
				account: { email, password },
				name,
			} = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createContext(ctx));
			await expectDatabaseDiffSnapshot(ctx, async () => {
				const result = await caller.procedure({ email, password });
				expect(result).toEqual<typeof result>({
					account: { id: accountId, verified: true },
					user: { name },
				});
			});
			expect(ctx.responseHeaders.get()).toMatchSnapshot();
		});

		test("login successful - unverified user", async ({ ctx }) => {
			const {
				accountId,
				account: { email, password },
				name,
			} = await insertAccountWithSession(ctx, {
				account: { confirmation: {} },
			});
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			const result = await caller.procedure({ email, password });
			expect(result).toEqual<typeof result>({
				account: { id: accountId, verified: false },
				user: { name },
			});
		});

		test("login successful - with different casing", async ({ ctx }) => {
			const {
				account: { email, password },
			} = await insertAccountWithSession(ctx);
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			await caller.procedure({ email: email.toUpperCase(), password });
		});
	});
});
