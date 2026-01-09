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
import { compare, parsers } from "~utils/date";
import { t } from "~web/handlers/trpc";
import { getRandomCurrencyCode } from "~web/handlers/utils.test";

import { procedure } from "./get-all";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debt-intenions.getAll", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// An unsynced debt waiting for foreign actor to accept
			await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						amount: originalDebt.amount + 1,
					}),
				},
			);
			// Our debt
			await insertDebt(ctx, accountId, userId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("debt intentions are fetched", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: userId }, { id: foreignToSelfUserId }] =
				await insertConnectedUsers(ctx, [accountId, foreignAccountId]);

			// An unsynced debt waiting for foreign actor to accept
			await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "our",
					fn: (originalDebt) => ({
						...originalDebt,
						amount: originalDebt.amount + 1,
					}),
				},
			);
			// Our debt
			await insertDebt(ctx, accountId, userId);
			// An unsynced debt waiting for us to accept
			const { id: foreignReceiptId } = await insertReceipt(
				ctx,
				foreignAccountId,
			);
			const [debtToUpdate, foreignDebtToUpdate] = await insertSyncedDebts(
				ctx,
				[accountId, userId],
				[foreignAccountId, foreignToSelfUserId],
				{
					ahead: "their",
					fn: (originalDebt) => ({
						...originalDebt,
						currencyCode: getRandomCurrencyCode(),
						amount: originalDebt.amount + 1,
						timestamp: parsers.plainDate("2020-04-01"),
						createdAt: parsers.zonedDateTime("2020-05-01T00:00:00.000[GMT]"),
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
					createdAt: parsers.zonedDateTime("2020-05-01T00:00:00.000[GMT]"),
				},
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>(
				[
					{
						id: debtToUpdate.id,
						userId,
						amount: -Number(foreignDebtToUpdate.amount),
						currencyCode: foreignDebtToUpdate.currencyCode,
						updatedAt: foreignDebtToUpdate.updatedAt,
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
						updatedAt: debtToCreate.updatedAt,
						timestamp: debtToCreate.timestamp,
						note: debtToCreate.note,
						receiptId: debtToCreate.receiptId || undefined,
						current: undefined,
					},
				].toSorted((a, b) => compare.zonedDateTime(b.updatedAt, a.updatedAt)),
			);
		});
	});
});
