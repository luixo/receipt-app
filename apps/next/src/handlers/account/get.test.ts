import { describe, expect } from "vitest";

import { router } from "next-app/handlers/index";
import { createAuthContext } from "next-tests/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "next-tests/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

describe("account.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((caller) => caller.account.get());
	});

	describe("data verification", () => {
		test("account-matched user does not exist", async ({ ctx }) => {
			const { database } = global.testContext!;
			const { id: accountId } = await insertAccount(database);
			const { id: sessionId } = await insertSession(database, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.account.get(),
				"INTERNAL_SERVER_ERROR",
				`No result for ${accountId} account found, self-user may be non-existent`,
			);
		});
	});

	describe("functionality", () => {
		test("verified account", async ({ ctx }) => {
			const { database } = global.testContext!;
			const { sessionId, accountId, name } = await insertAccountWithSession(
				database,
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.account.get();

			expect(account).toMatchObject<typeof account>({
				account: { id: accountId, verified: true },
				user: { name },
			});
		});

		test("unverified account", async ({ ctx }) => {
			const { database } = global.testContext!;
			const { sessionId, accountId, name } = await insertAccountWithSession(
				database,
				{ account: { confirmation: {} } },
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.account.get();

			expect(account).toMatchObject<typeof account>({
				account: { id: accountId, verified: false },
				user: { name },
			});
		});
	});
});
