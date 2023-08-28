import { faker } from "@faker-js/faker";
import { describe, expect, test } from "vitest";

import { MINUTE } from "app/utils/time";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "app/utils/validation";
import { router } from "next-app/handlers/index";
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

describe("auth.resetPassword", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async () => {
				const caller = router.createCaller(createContext());
				await expectTRPCError(
					() =>
						caller.auth.resetPassword({
							token: "invalid-uuid",
							password: "a".repeat(MIN_PASSWORD_LENGTH),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		describe("password", () => {
			test("minimal length", async () => {
				const caller = router.createCaller(createContext());
				await expectTRPCError(
					() =>
						caller.auth.resetPassword({
							token: faker.string.uuid(),
							password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Minimal length for password is ${MIN_PASSWORD_LENGTH}`,
				);
			});

			test("maximum length", async () => {
				const caller = router.createCaller(createContext());
				await expectTRPCError(
					() =>
						caller.auth.resetPassword({
							token: faker.string.uuid(),
							password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
						}),
					"BAD_REQUEST",
					`Zod error\n\nAt "password": Maximum length for password is ${MAX_PASSWORD_LENGTH}`,
				);
			});
		});

		test("no intention exists", async () => {
			const caller = router.createCaller(createContext());
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() =>
					caller.auth.resetPassword({
						token: intentionToken,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention ${intentionToken} does not exist or expired.`,
			);
		});

		test("intention expires", async () => {
			const { database } = global.testContext!;
			const { accountId } = await insertAccountWithSession(database);
			const { token } = await insertResetPasswordIntention(
				database,
				accountId,
				{ expiresTimestamp: new Date(Date.now() - MINUTE) },
			);
			const caller = router.createCaller(createContext());
			await expectTRPCError(
				() =>
					caller.auth.resetPassword({
						token,
						password: "a".repeat(MIN_PASSWORD_LENGTH),
					}),
				"NOT_FOUND",
				`Reset password intention ${token} does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("password reset", async () => {
			const { database } = global.testContext!;
			const { accountId } = await insertAccountWithSession(database);
			// Verifying other accounts are not affected
			const { accountId: otherAccountId } = await insertAccountWithSession(
				database,
			);
			// Verifying other intentions are not affected
			await insertResetPasswordIntention(database, otherAccountId);
			// Verifying other intentions of the same user are removed
			await insertResetPasswordIntention(database, accountId);
			await insertResetPasswordIntention(database, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			const { token } = await insertResetPasswordIntention(database, accountId);
			const context = createContext();
			const caller = router.createCaller(context);
			const password = faker.internet.password();
			await expectDatabaseDiffSnapshot(async () => {
				await caller.auth.resetPassword({
					token,
					password,
				});
			});
			const { passwordHash, passwordSalt } = await database
				.selectFrom("accounts")
				.where("id", "=", accountId)
				.select(["passwordHash", "passwordSalt"])
				.executeTakeFirstOrThrow();
			expect(getHash(password, passwordSalt)).toEqual(passwordHash);
			expect(context.setHeaders).toHaveLength(0);
		});
	});
});
