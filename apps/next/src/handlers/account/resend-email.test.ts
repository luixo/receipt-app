import { faker } from "@faker-js/faker";
import * as timekeeper from "timekeeper";

import { MINUTE } from "app/utils/time";
import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";

describe("account.resendEmail", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) => caller.account.resendEmail());

		test("account is already verified", async () => {
			const { database } = global.testContext!;
			const { sessionId, accountId } = await insertAccountWithSession(database);
			const caller = router.createCaller(createAuthContext(sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"BAD_REQUEST",
				`Account with id ${accountId} is already verified`,
			);
		});

		test("account is not eligible for repeating email sending", async () => {
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
			const caller = router.createCaller(createAuthContext(sessionId));
			await expectTRPCError(
				() => caller.account.resendEmail(),
				"BAD_REQUEST",
				`Verification email to ${accountId} was sent less than an hour ago. Please try again later.`,
			);
		});
	});

	describe("functionality", () => {
		const freezeDate = new Date("2020-01-01");

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

		test("email is not resent - service is disabled", async () => {
			const { emailService } = global.testContext!;
			emailService.active = false;

			await timekeeper.withFreeze(freezeDate, async () => {
				const { sessionId } = await insertReadyForEmailAccount();
				const caller = router.createCaller(createAuthContext(sessionId));
				await expectTRPCError(
					() => caller.account.resendEmail(),
					"FORBIDDEN",
					"Currently email resend is not supported",
				);
			});
		});

		test("email is not resent - something failed in an email provider", async () => {
			const { emailService } = global.testContext!;
			emailService.broke = true;

			await timekeeper.withFreeze(freezeDate, async () => {
				const { sessionId } = await insertReadyForEmailAccount();
				const caller = router.createCaller(createAuthContext(sessionId));
				await expectTRPCError(
					() => caller.account.resendEmail(),
					"INTERNAL_SERVER_ERROR",
					"Something went wrong: Test context broke email service error",
				);
			});
		});

		test("email is resent", async () => {
			const { database, emailService } = global.testContext!;

			// Verifying other accounts are not affected
			await insertAccountWithSession(database);
			await insertReadyForEmailAccount();
			await timekeeper.withFreeze(freezeDate, async () => {
				const { sessionId, email } = await insertReadyForEmailAccount();
				const caller = router.createCaller(createAuthContext(sessionId));
				await expectDatabaseDiffSnapshot(async () => {
					const { email: returnEmail } = await caller.account.resendEmail();
					expect(returnEmail).toEqual(email);
				});
			});
			expect(emailService.messages).toHaveLength(1);
			expect(emailService.messages[0]).toMatchSnapshot();
		});
	});
});
