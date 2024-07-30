import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accounts";

const router = t.router({ procedure });

describe("admin.accounts", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("accounts are fetched", async ({ ctx }) => {
			const { accountId, sessionId } = await insertAccountWithSession(ctx, {
				account: { role: "admin" },
			});
			const foreignAccount = await insertAccount(ctx, { avatarUrl: null });
			const connectedAccount = await insertAccount(ctx);
			const [foreignUser] = await insertConnectedUsers(ctx, [
				accountId,
				connectedAccount.id,
			]);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const accounts = await caller.procedure();

			expect(accounts).toStrictEqual<typeof accounts>(
				[
					{
						account: {
							id: foreignAccount.id,
							email: foreignAccount.email,
							avatarUrl: foreignAccount.avatarUrl,
						},
						user: undefined,
					},
					{
						account: {
							id: connectedAccount.id,
							email: connectedAccount.email,
							avatarUrl: connectedAccount.avatarUrl,
						},
						user: { id: foreignUser.id, name: foreignUser.name },
					},
				].sort((a, b) => b.account.email.localeCompare(a.account.email)),
			);
		});
	});
});
