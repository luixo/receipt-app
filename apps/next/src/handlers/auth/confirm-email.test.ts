import { faker } from "@faker-js/faker";
import assert from "node:assert";
import { describe, expect, test } from "vitest";

import { router } from "next-app/handlers/index";
import { createContext } from "next-tests/utils/context";
import { insertAccountWithSession } from "next-tests/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
} from "next-tests/utils/expect";

describe("auth.confirmEmail", () => {
	describe("input verification", () => {
		describe("token", () => {
			test("invalid", async () => {
				const caller = router.createCaller(createContext());
				await expectTRPCError(
					() => caller.auth.confirmEmail({ token: "invalid-uuid" }),
					"BAD_REQUEST",
					`Zod error\n\nAt "token": Invalid uuid`,
				);
			});
		});

		test("no confirmation token exists", async () => {
			const { database } = global.testContext!;
			const caller = router.createCaller(createContext());
			const confirmationToken = faker.string.uuid();
			await insertAccountWithSession(database);
			await expectTRPCError(
				() => caller.auth.confirmEmail({ token: confirmationToken }),
				"NOT_FOUND",
				`There is no account with confirmation token ${confirmationToken}`,
			);
		});
	});

	describe("functionality", () => {
		test("account confirmed", async () => {
			const { database } = global.testContext!;
			const {
				account: { confirmationToken, email },
			} = await insertAccountWithSession(database, {
				account: { confirmation: {} },
			});
			// Verifying other accounts (both confirmed and not) are not affected
			await insertAccountWithSession(database);
			await insertAccountWithSession(database, {
				account: { confirmation: {} },
			});
			const context = createContext();
			const caller = router.createCaller(context);
			assert(
				confirmationToken,
				"Confirmation token should exist on creation of test account",
			);
			await expectDatabaseDiffSnapshot(async () => {
				const result = await caller.auth.confirmEmail({
					token: confirmationToken,
				});
				expect(result).toEqual<typeof result>({ email });
			});
		});
	});
});
