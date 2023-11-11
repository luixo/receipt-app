import { faker } from "@faker-js/faker";
import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertSyncedDebts,
} from "@tests/backend/utils/data";
import {
	expectDatabaseDiffSnapshot,
	expectTRPCError,
	expectUnauthorizedError,
} from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import { MINUTE } from "app/utils/time";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./accept-all-intentions";
import { getRandomCurrencyCode } from "./utils.test";

const router = t.router({ procedure });

describe("debts.acceptAllIntentions", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);

		test("no intentions to accept", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// An outdated intention
			await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date() }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({
						...originalDebt,
						lockedTimestamp: new Date(new Date().valueOf() - MINUTE),
					}),
				],
			);
			// No intention to sync from our side
			await insertDebt(ctx, accountId, userId);
			// No intention to sync from their side
			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				[accountId, userId, { lockedTimestamp: new Date() }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({
						...originalDebt,
						lockedTimestamp: new Date(new Date().valueOf() - MINUTE),
					}),
				],
			);
			// No intention to sync from our side
			await insertDebt(ctx, accountId, userId);
			// No intention to sync from their side
			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);
			// Updated debt
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [debtToUpdate] = await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date("2020-06-01") }],
				[
					foreignAccountId,
					foreignToSelfUserId,
					(originalDebt) => ({
						id: originalDebt.id,
						currencyCode: getRandomCurrencyCode(),
						amount: faker.finance.amount(),
						timestamp: new Date("2020-04-01"),
						created: new Date("2020-05-01"),
						note: faker.lorem.words(),
						lockedTimestamp: new Date("2020-06-02"),
						receiptId: foreignReceiptId,
					}),
				],
			);
			// Created debt
			const { id: anotherForeignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const debtToCreate = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{
					lockedTimestamp: new Date(),
					created: new Date("2020-05-01"),
					receiptId: anotherForeignReceiptId,
				},
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await expectDatabaseDiffSnapshot(ctx, () =>
				caller.procedure(),
			);
			expect(result).toStrictEqual<typeof result>([
				{
					id: debtToUpdate.id,
					created: debtToUpdate.created,
				},
				{
					id: debtToCreate.id,
					created: new Date(),
				},
			]);
		});
	});
});
