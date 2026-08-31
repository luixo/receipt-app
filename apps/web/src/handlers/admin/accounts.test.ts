import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import type { insertUser } from "~tests/backend/utils/data";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accounts";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const getAccountShape = (
	account: Awaited<ReturnType<typeof insertAccount>>,
	user?: Awaited<ReturnType<typeof insertUser>>,
) => ({
	account: {
		id: account.id,
		email: account.email,
		avatarUrl: account.avatarUrl,
	},
	user: user ? { id: user.id, name: user.name } : undefined,
});

describe("admin.accounts", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("accounts are fetched", async ({ ctx }) => {
			const { accountId, sessionId } = await insertAccountWithSession(ctx, {
				account: { role: "admin" },
			});
			const foreignAccount = await insertAccount(ctx, { avatarUrl: null });
			const anotherForeignAccount = await insertAccount(ctx, {
				avatarUrl: null,
			});
			const connectedAccount = await insertAccount(ctx);
			const [foreignUser] = await insertConnectedUsers(ctx, [
				accountId,
				connectedAccount.id,
			]);
			const anotherConnectedAccount = await insertAccount(ctx);
			const [anotherForeignUser] = await insertConnectedUsers(ctx, [
				accountId,
				anotherConnectedAccount.id,
			]);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const accounts = await caller.procedure();

			expect(accounts).toStrictEqual<typeof accounts>(
				[
					getAccountShape(foreignAccount),
					getAccountShape(anotherForeignAccount),
					getAccountShape(connectedAccount, foreignUser),
					getAccountShape(anotherConnectedAccount, anotherForeignUser),
				].toSorted((a, b) => {
					const emailComparison = a.account.email.localeCompare(
						b.account.email,
					);
					if (a.user && b.user) {
						const nameComparison = a.user.name.localeCompare(b.user.name);
						return nameComparison === 0 ? emailComparison : nameComparison;
					}
					if (a.user) {
						return -1;
					}
					if (b.user) {
						return 1;
					}
					return emailComparison;
				}),
			);
		});
	});
});
