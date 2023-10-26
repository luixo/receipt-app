import { describe, expect } from "vitest";

import { createAuthContext } from "@tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertSyncedDebts,
	insertUser,
} from "@tests/backend/utils/data";
import { expectUnauthorizedError } from "@tests/backend/utils/expect";
import { test } from "@tests/backend/utils/test";
import type { CurrencyCode } from "app/utils/currency";
import { t } from "next-app/handlers/trpc";

import { procedure } from "./get-by-users";

const mapUserDebts = (debts: Awaited<ReturnType<typeof insertDebt>>[]) =>
	Object.entries(
		debts.reduce<Record<CurrencyCode, number>>((acc, debt) => {
			if (!acc[debt.currencyCode]) {
				acc[debt.currencyCode] = 0;
			}
			acc[debt.currencyCode] += Number(debt.amount);
			acc[debt.currencyCode] = Number(acc[debt.currencyCode]!.toFixed(2));
			return acc;
		}, {}),
	)
		.map(([currencyCode, sum]) => ({ currencyCode, sum }))
		.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));

const router = t.router({ procedure });

describe("debts.getByUsers", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
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

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
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
				[
					accountId,
					user.id,
					{ lockedTimestamp: new Date(), currencyCode: "USD" },
				],
				[foreignAccountId, foreignToSelfUserId],
			);
			const userDebts = await Promise.all([
				syncedDebt,
				insertDebt(ctx, accountId, user.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, user.id, {
					currencyCode: "EUR",
					lockedTimestamp: new Date(),
				}),
			]);

			const anotherUser = await insertUser(ctx, accountId);
			const anotherUserDebts = await Promise.all([
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "USD" }),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "EUR" }),
				insertDebt(ctx, accountId, anotherUser.id, {
					currencyCode: "EUR",
					lockedTimestamp: new Date(),
				}),
				insertDebt(ctx, accountId, anotherUser.id, { currencyCode: "GEL" }),
			]);

			const users = [user, anotherUser];

			// Verify other accounts users don't affect the result
			const { id: foreignUserId } = await insertUser(ctx, foreignAccountId);
			await insertDebt(ctx, foreignAccountId, foreignUserId);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toStrictEqual<typeof result>(
				[
					{
						userId: user.id,
						debts: mapUserDebts(userDebts),
					},
					{
						userId: anotherUser.id,
						debts: mapUserDebts(anotherUserDebts),
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
	});
});
