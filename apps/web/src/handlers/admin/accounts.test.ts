import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import type { insertPeer } from "~tests/backend/utils/data";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedPeers,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accounts";

const createCaller = t.createCallerFactory(t.router({ procedure }));

const getAccountShape = (
	account: Awaited<ReturnType<typeof insertAccount>>,
	peer?: Awaited<ReturnType<typeof insertPeer>>,
) => ({
	account: {
		id: account.id,
		email: account.email,
		avatarUrl: account.avatarUrl,
	},
	peer: peer ? { id: peer.id, name: peer.name } : undefined,
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
			const [foreignPeer] = await insertConnectedPeers(ctx, [
				accountId,
				connectedAccount.id,
			]);
			const anotherConnectedAccount = await insertAccount(ctx);
			const [anotherForeignPeer] = await insertConnectedPeers(ctx, [
				accountId,
				anotherConnectedAccount.id,
			]);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const accounts = await caller.procedure();

			expect(accounts).toStrictEqual<typeof accounts>({
				items: [
					getAccountShape(foreignAccount),
					getAccountShape(anotherForeignAccount),
					getAccountShape(connectedAccount, foreignPeer),
					getAccountShape(anotherConnectedAccount, anotherForeignPeer),
				].toSorted((a, b) => {
					const emailComparison = a.account.email.localeCompare(
						b.account.email,
					);
					if (a.peer && b.peer) {
						const nameComparison = a.peer.name.localeCompare(b.peer.name);
						return nameComparison === 0 ? emailComparison : nameComparison;
					}
					if (a.peer) {
						return -1;
					}
					if (b.peer) {
						return 1;
					}
					return emailComparison;
				}),
			});
		});
	});
});
