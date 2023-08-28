import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { MINUTE } from "app/utils/time";
import { t } from "next-app/handlers/trpc";
import { createContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertResetPasswordIntention,
} from "next-tests/utils/data";
import { expectTRPCError } from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./get";

const router = t.router({ procedure });

describe("resetPasswordIntentions.get", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() => caller.procedure({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		test("no intention token exists", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const intentionToken = faker.string.uuid();
			await expectTRPCError(
				() => caller.procedure({ token: intentionToken }),
				"NOT_FOUND",
				`Reset password intention ${intentionToken} does not exist or expired.`,
			);
		});

		test("intention token is expired", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const { id: accountId } = await insertAccount(ctx);
			const { token } = await insertResetPasswordIntention(ctx, accountId, {
				expiresTimestamp: new Date(Date.now() - MINUTE),
			});
			await expectTRPCError(
				() => caller.procedure({ token }),
				"NOT_FOUND",
				`Reset password intention ${token} does not exist or expired.`,
			);
		});
	});

	describe("functionality", () => {
		test("email is returned", async ({ ctx }) => {
			const {
				accountId,
				account: { email },
			} = await insertAccountWithSession(ctx);
			const { token } = await insertResetPasswordIntention(ctx, accountId);
			const caller = router.createCaller(createContext(ctx));
			const result = await caller.procedure({ token });
			expect(result).toEqual<typeof result>({ email });
		});
	});
});
