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
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-intentions";
import { getRandomCurrencyCode } from "./utils.test";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getIntentions", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
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
			// Our debt
			await insertDebt(ctx, accountId, userId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("debt intentions are fetched", async ({ ctx }) => {
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
			// Our debt
			await insertDebt(ctx, accountId, userId);
			// Updated debt
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [debtToUpdate, foreignDebtToUpdate] = await insertSyncedDebts(
				ctx,
				[accountId, userId, { lockedTimestamp: new Date("2020-06-01") }],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "their",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: Number(faker.finance.amount()),
						timestamp: new Date("2020-04-01"),
						createdAt: new Date("2020-05-01"),
						note: faker.lorem.words(),
						receiptId: foreignReceiptId,
					}),
				},
			);
			// Created debt
			const debtToCreate = await insertDebt(
				ctx,
				foreignAccountId,
				foreignToSelfUserId,
				{
					createdAt: new Date("2020-05-01"),
				},
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>(
				[
					{
						id: debtToUpdate.id,
						userId,
						amount: -Number(foreignDebtToUpdate.amount),
						currencyCode: foreignDebtToUpdate.currencyCode,
						lockedTimestamp: foreignDebtToUpdate.lockedTimestamp,
						timestamp: foreignDebtToUpdate.timestamp,
						note: debtToUpdate.note,
						receiptId: foreignDebtToUpdate.receiptId || undefined,
						current: {
							amount: Number(debtToUpdate.amount),
							timestamp: debtToUpdate.timestamp,
							currencyCode: debtToUpdate.currencyCode,
						},
					},
					{
						id: debtToCreate.id,
						userId,
						amount: -Number(debtToCreate.amount),
						currencyCode: debtToCreate.currencyCode,
						lockedTimestamp: debtToCreate.lockedTimestamp,
						timestamp: debtToCreate.timestamp,
						note: debtToCreate.note,
						receiptId: debtToCreate.receiptId || undefined,
						current: undefined,
					},
				].sort(
					(a, b) => b.lockedTimestamp.valueOf() - a.lockedTimestamp.valueOf(),
				),
			);
		});
	});
});
