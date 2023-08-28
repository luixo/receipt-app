import { faker } from "@faker-js/faker";
import assert from "node:assert";
import { describe, expect } from "vitest";

import { router } from "next-app/handlers/index";
import { createContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("auth.voidAccount", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async ({ ctx }) => {
				const caller = router.createCaller(createContext(ctx));
				await expectTRPCError(
					() => caller.auth.voidAccount({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		test("no confirmation token exists", async ({ ctx }) => {
			const caller = router.createCaller(createContext(ctx));
			const confirmationToken = faker.string.uuid();
			// Verify that not every not verified account counts
			await insertAccountWithSession(ctx.database);
			await insertAccountWithSession(ctx.database, {
				account: { confirmation: {} },
			});
			await expectTRPCError(
				() => caller.auth.voidAccount({ token: confirmationToken }),
				"NOT_FOUND",
				`There is no account with confirmation token ${confirmationToken}`,
			);
		});
	});

	describe("functionality", () => {
		test("account voided", async ({ ctx }) => {
			const {
				account: { confirmationToken, email },
			} = await insertAccountWithSession(ctx.database, {
				account: { confirmation: {} },
			});
			// Verifying other accounts (both confirmed and not) are not affected
			await insertAccountWithSession(ctx.database);
			await insertAccountWithSession(ctx.database, {
				account: { confirmation: {} },
			});
			const context = createContext(ctx);
			const caller = router.createCaller(context);
			assert(
				confirmationToken,
				"Confirmation token should exist on creation of test account",
			);
			await expectDatabaseDiffSnapshot(ctx, async () => {
				const result = await caller.auth.voidAccount({
					token: confirmationToken,
				});
				expect(result).toEqual<typeof result>({ email });
			});
		});

		test.todo("verify account users are removed");
		test.todo("verify account debts are removed");
		test.todo("verify account receipts are removed");
		test.todo("verify account connection intentions are removed");
		test.todo("verify account settings are removed");
		test.todo("verify account reset password intentions are removed");
	});
});
