import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
} from "~tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./accept-all-intentions";
import { getRandomCurrencyCode } from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.acceptAllIntentions", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());

		test("no intentions to accept", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// An outdated intention
			await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{ ahead: "our" },
			);
			// An intention to sync from our side
			await insertDebt(ctx, accountId, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			await expectTRPCError(
				() => caller.procedure(),
				"BAD_REQUEST",
				`Expected to have at least one debt to accept.`,
			);
		});
	});

	describe("functionality", () => {
		test("debts are synced", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// An outdated intention
			await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{ ahead: "our" },
			);
			// An intention to sync from their side
			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);
			// Updated debt
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
					ahead: "their",
				},
			);
			// Created debt
			const { id: anotherForeignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId, {
				createdAt: new Date("2020-05-01"),
				receiptId: anotherForeignReceiptId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(),
			);
			expect(result).toStrictEqual<typeof result>(undefined);
		});
	});
});
