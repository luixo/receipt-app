import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertSession,
} from "@tests/backend/utils/data";
import {
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get";

const router = t.router({ procedure });

describe("account.get", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("data verification", () => {
		test("account-matched user does not exist", async ({ ctx }) => {
			const { id: accountId } = await insertAccount(ctx);
			const { id: sessionId } = await insertSession(ctx, accountId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"INTERNAL_SERVER_ERROR",
				`No result for ${accountId} account found, self-user may be non-existent`,
			);
		});
	});

	describe("functionality", () => {
		test("verified account", async ({ ctx }) => {
			const { sessionId, accountId, name } = await insertAccountWithSession(
				ctx,
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toMatchObject<typeof account>({
				account: { id: accountId, verified: true },
				user: { name },
			});
		});

		test("unverified account", async ({ ctx }) => {
			const { sessionId, accountId, name } = await insertAccountWithSession(
				ctx,
				{ account: { confirmation: {} } },
			);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));

			const account = await caller.procedure();

			expect(account).toMatchObject<typeof account>({
				account: { id: accountId, verified: false },
				user: { name },
			});
		});
	});
});
