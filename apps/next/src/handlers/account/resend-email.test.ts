import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MINUTE } from "app/utils/time";
import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("account.resendEmail", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) => caller.account.resendEmail());

		test("account is already verified", async ({ ctx }) => {
			const { database } = global.testContext!;
			const { sessionId, accountId } = await insertAccountWithSession(database);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"BAD_REQUEST",
				`Account with id ${accountId} is already verified`,
			);
		});

		test("account is not eligible for repeating email sending", async ({
			ctx,
		}) => {
			const { database } = global.testContext!;
			const { sessionId, accountId } = await insertAccountWithSession(
				database,
				{
					account: {
						confirmation: {
							// Simulating an email sent 55 minutes ago
							timestamp: new Date(Date.now() - 55 * MINUTE),
						},
					},
				},
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"BAD_REQUEST",
				`Verification email to ${accountId} was sent less than an hour ago. Please try again later.`,
			);
		});
	});

	describe("functionality", () => {
		const insertReadyForEmailAccount = async () => {
			const { database } = global.testContext!;
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(database, {
				account: {
					email: faker.internet.email(),
					confirmation: {
						// Simulating an email sent 65 minutes ago
						timestamp: new Date(Date.now() - 65 * MINUTE),
					},
				},
			});
			return { sessionId, email };
		};

		test("email is not resent - service is disabled", async ({ ctx }) => {
			ctx.emailOptions.active = false;
			const { sessionId } = await insertReadyForEmailAccount();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"FORBIDDEN",
				"Currently email resend is not supported",
			);
		});

		test("email is not resent - something failed in an email provider", async ({
			ctx,
		}) => {
			ctx.emailOptions.broken = true;
			const { sessionId } = await insertReadyForEmailAccount();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.cachedMessages).toHaveLength(0);
		});

		test("email is resent", async ({ ctx }) => {
			const { database } = global.testContext!;

			// Verifying other accounts are not affected
			await insertAccountWithSession(database);
			await insertReadyForEmailAccount();
			const { sessionId, email } = await insertReadyForEmailAccount();
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(async () => {
				const { email: returnEmail } = await caller.account.resendEmail();
				expect(returnEmail).toEqual(email);
			});
			expect(ctx.emailOptions.cachedMessages).toHaveLength(1);
			expect(ctx.emailOptions.cachedMessages![0]).toMatchSnapshot();
		});
	});
});
