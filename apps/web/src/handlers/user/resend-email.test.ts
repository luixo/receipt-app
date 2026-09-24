import { faker } from "@faker-js/faker";
import { assert, describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import { insertUserWithSession } from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import type { TestContext } from "~tests/backend/utils/test";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./resend-email";

const insertReadyForEmailUser = async (ctx: TestContext) => {
	const {
		sessionId,
		user: { email },
	} = await insertUserWithSession(ctx, {
		user: {
			email: faker.internet.email(),
			confirmation: {
				// Simulating an email sent 65 minutes ago
				timestamp: Temporal.Now.zonedDateTimeISO().subtract({
					minutes: 5,
					hours: 1,
				}),
			},
		},
	});
	return { sessionId, email };
};

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("user.resendEmail", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());

		test("user is already verified", async ({ ctx }) => {
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`User "${email}" is already verified.`,
			);
		});

		test("user is not eligible for repeating email sending", async ({
			ctx,
		}) => {
			const {
				sessionId,
				user: { email },
			} = await insertUserWithSession(ctx, {
				user: {
					confirmation: {
						// Simulating an email sent 55 minutes ago
						timestamp: Temporal.Now.zonedDateTimeISO().subtract({
							minutes: 55,
						}),
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
		test("email is not resent - service is disabled", async ({ ctx }) => {
			ctx.emailOptions.setActive(false);
			const { sessionId } = await insertReadyForEmailUser(ctx);
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
			ctx.emailOptions.setBroken(true);
			const { sessionId } = await insertReadyForEmailUser(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"INTERNAL_SERVER_ERROR",
				"Something went wrong: Test context broke email service error",
			);
			expect(ctx.emailOptions.mock.getMessages()).toHaveLength(0);
		});

		test("email is resent", async ({ ctx }) => {
			// Verifying other users are not affected
			await insertUserWithSession(ctx);
			await insertReadyForEmailUser(ctx);
			const { sessionId, email } = await insertReadyForEmailUser(ctx);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const { email: returnEmail } = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(),
			);
			expect(returnEmail).toStrictEqual<typeof returnEmail>(email);
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
	});
});
