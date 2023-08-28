import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { router } from "next-app/handlers/index";
import { MAX_INTENTIONS_AMOUNT } from "next-app/handlers/validation";
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

describe("resetPasswordIntentions.add", () => {
	describe("input verification", () => {
		describe("email", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() =>
						caller.resetPasswordIntentions.add({ email: "invalid@@mail.org" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "email": Invalid email address`,
				);
			});
		});

		test("email doesn't exist", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const email = faker.internet.email();
			await expectTRPCError(
				() => caller.resetPasswordIntentions.add({ email }),
				"NOT_FOUND",
				`Account with email ${email} does not exist.`,
			);
		});

		test("too many reset intentions", async ({ ctx }) => {
			const { database } = global.testContext!;
			const caller = router.createCaller(createContext(ctx));
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(database);
			await Promise.all(
				new Array(MAX_INTENTIONS_AMOUNT)
					.fill(null)
					.map(() => insertResetPasswordIntention(database, accountId)),
			);
			await expectTRPCError(
				() => caller.resetPasswordIntentions.add({ email }),
				"FORBIDDEN",
				`Maximum amount of intentions per day is ${MAX_INTENTIONS_AMOUNT}, please try later`,
			);
		});
	});

	describe("functionality", () => {
		test("email service is disabled", async ({ ctx }) => {
			const { database } = global.testContext!;
			ctx.emailOptions.active = false;
			const {
				account: { email },
			} = await insertAccountWithSession(database);
			const caller = router.createCaller(createContext(ctx));

			await expectTRPCError(
				() => caller.resetPasswordIntentions.add({ email }),
				"FORBIDDEN",
				`Currently password reset is not supported`,
			);
		});

		test("email service is broken", async ({ ctx }) => {
			const { database } = global.testContext!;
			ctx.emailOptions.broken = true;
			const {
				account: { email },
			} = await insertAccountWithSession(database);
			const caller = router.createCaller(createContext(ctx));

			await expectTRPCError(
				() => caller.resetPasswordIntentions.add({ email }),
				"INTERNAL_SERVER_ERROR",
				"Test context broke email service error",
			);
		});

		test("reset password intention added", async ({ ctx }) => {
			const { database } = global.testContext!;
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(database);
			const caller = router.createCaller(createContext(ctx));

			// Verify we can add an intention even if we already have one
			await insertResetPasswordIntention(database, accountId);
			await expectDatabaseDiffSnapshot(() =>
				caller.resetPasswordIntentions.add({ email }),
			);
			expect(ctx.emailOptions.cachedMessages).toHaveLength(1);
			expect(ctx.emailOptions.cachedMessages![0]).toMatchSnapshot();
		});
	});
});
