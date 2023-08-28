import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MINUTE } from "app/utils/time";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "app/utils/validation";
import { t } from "next-app/handlers/trpc";
import { getHash } from "next-app/utils/crypto";
import { createContext } from "next-tests/utils/context";
import {
	insertAccountWithSession,
	insertResetPasswordIntention,
} from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./reset-password";

const router = t.router({ procedure });

describe("auth.resetPassword", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							token: "invalid-uuid",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		describe("password", () => {
			test("minimal length", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.procedure({
							token: faker.string.uuid(),
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
							token: faker.string.uuid(),
							password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		test("no intention exists", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.procedure({
						token: intentionToken,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention ${intentionToken} does not exist or expired.`,
			);
		});

		test("intention expires", async ({ ctx }) => {
			const { accountId } = await insertAccountWithSession(ctx);
			const { token } = await insertResetPasswordIntention(ctx, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			const caller = router.createCaller(createContext(ctx));
			await expectTRPCError(
				() =>
					caller.procedure({
						token,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention ${token} does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("password reset", async ({ ctx }) => {
			const { accountId } = await insertAccountWithSession(ctx);
			// Verifying other accounts are not affected
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			// Verifying other intentions are not affected
			await insertResetPasswordIntention(ctx, otherAccountId);
			// Verifying other intentions of the same user are removed
			await insertResetPasswordIntention(ctx, accountId);
			await insertResetPasswordIntention(ctx, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			const { token } = await insertResetPasswordIntention(ctx, accountId);
			const caller = router.createCaller(createContext(ctx));
			const password = faker.internet.password();
			await expectDatabaseDiffSnapshot(ctx, async () => {
				await caller.procedure({
					token,
					password,
				});
			});
			const { passwordHash, passwordSalt } = await ctx.database
				.selectFrom("accounts")
				.where("id", "=", accountId)
				.select(["passwordHash", "passwordSalt"])
				.executeTakeFirstOrThrow();
			expect(getHash(password, passwordSalt)).toEqual(passwordHash);
			expect(ctx.responseHeaders).toHaveLength(0);
		});
	});
});
