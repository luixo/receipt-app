import { faker } from "@faker-js/faker";
import { describe, expect, test } from "vitest";

import { MINUTE } from "app/utils/time";
import { router } from "next-app/handlers/index";
import { createContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertResetPasswordIntention,
} from "next-tests/utils/data";
import { expectTRPCError } from "next-tests/utils/expect";

describe("resetPasswordIntentions.get", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async () => {
				const caller = router.createCaller(createContext());
				await expectTRPCError(
					() => caller.resetPasswordIntentions.get({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		test("no intention token exists", async () => {
			const caller = router.createCaller(createContext());
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() => caller.resetPasswordIntentions.get({ token: intentionToken }),
				"NOT_FOUND",
				`Reset password intention ${intentionToken} does not exist or expired.`,
			);
		});

		test("intention token is expired", async () => {
			const { database } = global.testContext!;
			const caller = router.createCaller(createContext());
			const { id: accountId } = await insertAccount(database);
			const { token } = await insertResetPasswordIntention(
				database,
				accountId,
				{ expiresTimestamp: new Date(Date.now() - MINUTE) },
			);
			await expectTRPCError(
				() => caller.resetPasswordIntentions.get({ token }),
				"NOT_FOUND",
				`Reset password intention ${token} does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("email is returned", async () => {
			const { database } = global.testContext!;
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(database);
			const { token } = await insertResetPasswordIntention(database, accountId);
			const caller = router.createCaller(createContext());
			const result = await caller.resetPasswordIntentions.get({ token });
			expect(result).toEqual<typeof result>({ email });
		});
	});
});
