import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MINUTE } from "app/utils/time";
import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import type { TestContext } from "next-tests/utils/test";
import { test } from "next-tests/utils/test";

import { procedure } from "./resend-email";

const router = t.router({ procedure });

describe("account.resendEmail", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);

		test("account is already verified", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`Account with id ${accountId} is already verified`,
			);
		});

		test("account is not eligible for repeating email sending", async ({
			ctx,
		}) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx, {
				account: {
					confirmation: {
						// Simulating an email sent 55 minutes ago
						timestamp: new Date(Date.now() - 55 * MINUTE),
					},
				},
			});
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`Verification email to ${accountId} was sent less than an hour ago. Please try again later.`,
			);
		});
	});

	describe("functionality", () => {
		const insertReadyForEmailAccount = async (ctx: TestContext) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx, {
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
			const { sessionId } = await insertReadyForEmailAccount(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"FORBIDDEN",
				"Currently email resend is not supported",
			);
		});

		test("email is not resent - something failed in an email provider", async ({
			ctx,
		}) => {
			ctx.emailOptions.broken = true;
			const { sessionId } = await insertReadyForEmailAccount(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.cachedMessages).toHaveLength(0);
		});

		test("email is resent", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			await insertReadyForEmailAccount(ctx);
			const { sessionId, email } = await insertReadyForEmailAccount(ctx);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectDatabaseDiffSnapshot(ctx, async () => {
				const { email: returnEmail } = await caller.procedure();
				expect(returnEmail).toEqual(email);
			});
			expect(ctx.emailOptions.cachedMessages).toHaveLength(1);
			expect(ctx.emailOptions.cachedMessages![0]).toMatchSnapshot();
		});
	});
});
