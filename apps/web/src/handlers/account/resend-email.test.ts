import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertAccountWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { MINUTE } from "~utils/time";
import { t } from "~web/handlers/trpc";

import { procedure } from "./resend-email";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("account.resendEmail", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());

		test("account is already verified", async ({ ctx }) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`Account "${email}" is already verified.`,
			);
		});

		test("account is not eligible for repeating email sending", async ({
			ctx,
		}) => {
			const {
				sessionId,
				account: { email },
			} = await insertAccountWithSession(ctx, {
				account: {
					confirmation: {
						// Simulating an email sent 55 minutes ago
						timestamp: new Date(Date.now() - 55 * MINUTE),
					},
				},
			});
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`Verification email to "${email}" was sent less than an hour ago. Please try again later.`,
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
			const caller = createCaller(createAuthContext(ctx, sessionId));
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
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});

		test("email is resent", async ({ ctx }) => {
			// Verifying other accounts are not affected
			await insertAccountWithSession(ctx);
			await insertReadyForEmailAccount(ctx);
			const { sessionId, email } = await insertReadyForEmailAccount(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { email: returnEmail } = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(),
			);
			expect(returnEmail).toBe(email);
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
	});
});
