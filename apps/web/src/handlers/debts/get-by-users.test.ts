import { entries, isNonNullish } from "remeda";
import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertSyncedDebts,
	insertUser,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-by-users";

const mapUserDebts = (debts: Awaited<ReturnType<typeof insertDebt>>[]) =>
	entries(
		debts.reduce<Record<CurrencyCode, number>>((acc, debt) => {
			const amount = (acc[debt.currencyCode] ?? 0) + Number(debt.amount);
			acc[debt.currencyCode] = Number(amount.toFixed(2));
			return acc;
		}, {}),
	)
		.map(([currencyCode, sum]) => ({ currencyCode, sum }))
		.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("debts.getByUsers", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("empty list", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [{ id: foreignToSelfUserId }] = await insertConnectedUsers(ctx, [
				foreignAccountId,
				accountId,
			]);

			await insertDebt(ctx, foreignAccountId, foreignToSelfUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>([]);
		});

		test("debts by users", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const [user, { id: foreignToSelfUserId }] = await insertConnectedUsers(
				ctx,
				[accountId, foreignAccountId],
			);
			const [syncedDebt] = await insertSyncedDebts(
				ctx,
				[accountId, user.id, { currencyCode: "USD" }],
				[foreignAccountId, foreignToSelfUserId],
			);
			const userDebts = await Promise.all([
				syncedDebt,
				insertDebt(ctx, accountId, user.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, user.id, { currencyCode: "EUR" }),
				insertDebt(ctx, foreignAccountId, foreignToSelfUserId).then(() => null),
			]);

			const anotherUser = await insertUser(ctx, accountId);
			const anotherUserDebts = await Promise.all([
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "EUR" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "GEL" }),
			]);

			const users = [user, anotherUser];

			// Verify other accounts users don't affect the result
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>(
				[
					{
						userId: user.id,
						debts: mapUserDebts(userDebts.filter(isNonNullish)),
						unsyncedDebtsAmount: 3,
					},
					{
						userId: anotherUser.id,
						debts: mapUserDebts(anotherUserDebts),
						unsyncedDebtsAmount: 0,
					},
				].sort((a, b) => {
					const aUser = users.find((lookupUser) => a.userId === lookupUser.id);
					if (!aUser) {
						throw new Error(`User ${a.userId} not found`);
					}
					const bUser = users.find((lookupUser) => b.userId === lookupUser.id);
					if (!bUser) {
						throw new Error(`User ${b.userId} not found`);
					}
					return aUser.name.localeCompare(bUser.name);
				}),
			);
		});

		describe("unsynced amount of debts", () => {
			describe("synced debts", () => {
				test("user counterparty is connected", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);
					const [user, { id: foreignToSelfUserId }] =
						await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
					const [syncedDebt] = await insertSyncedDebts(
						ctx,
						[accountId, user.id],
						[foreignAccountId, foreignToSelfUserId],
					);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure();
					expect(result).toStrictEqual<typeof result>([
						{
							userId: user.id,
							debts: mapUserDebts([syncedDebt]),
							unsyncedDebtsAmount: 0,
						},
					]);
				});

				test("user counterparty is not connected", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: userId } = await insertUser(ctx, accountId);
					const localDebt = await insertDebt(ctx, accountId, userId);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure();
					expect(result).toStrictEqual<typeof result>([
						{
							userId,
							debts: mapUserDebts([localDebt]),
							unsyncedDebtsAmount: 0,
						},
					]);
				});
			});

			describe("unsynced debts", () => {
				test("debt with no foreign counterparty", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);
					const [user] = await insertConnectedUsers(ctx, [
						accountId,
						foreignAccountId,
					]);
					const localDebt = await insertDebt(ctx, accountId, user.id);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure();
					expect(result).toStrictEqual<typeof result>([
						{
							userId: user.id,
							debts: mapUserDebts([localDebt]),
							unsyncedDebtsAmount: 1,
						},
					]);
				});

				test("desynced debt", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);
					const [user, { id: foreignToSelfUserId }] =
						await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
					const [desyncedDebt] = await insertSyncedDebts(
						ctx,
						[accountId, user.id],
						[foreignAccountId, foreignToSelfUserId],
						{
							ahead: "their",
							fn: (originalDebt) => ({
								...originalDebt,
								amount: originalDebt.amount + 1,
							}),
						},
					);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure();
					expect(result).toStrictEqual<typeof result>([
						{
							userId: user.id,
							debts: mapUserDebts([desyncedDebt]),
							unsyncedDebtsAmount: 1,
						},
					]);
				});

				test("multiple debts", async ({ ctx }) => {
					const { sessionId, accountId } = await insertAccountWithSession(ctx);
					const { id: foreignAccountId } = await insertAccount(ctx);
					const [user, { id: foreignToSelfUserId }] =
						await insertConnectedUsers(ctx, [accountId, foreignAccountId]);
					const unsyncedDebts = await Promise.all([
						insertDebt(ctx, accountId, user.id),
						insertDebt(ctx, accountId, user.id),
						insertSyncedDebts(
							ctx,
							[accountId, user.id],
							[foreignAccountId, foreignToSelfUserId],
							{
								ahead: "their",
								fn: (originalDebt) => ({
									...originalDebt,
									amount: originalDebt.amount + 1,
								}),
							},
						),
					]);
					// Synced debt
					await insertSyncedDebts(
						ctx,
						[accountId, user.id],
						[foreignAccountId, foreignToSelfUserId],
					);
					const caller = createCaller(createAuthContext(ctx, sessionId));
					const result = await caller.procedure();
					expect(result[0]?.unsyncedDebtsAmount).toBe<number>(
						unsyncedDebts.length,
					);
				});
			});
		});
	});
});
