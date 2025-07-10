import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccountWithSession,
	insertConnectedUsers,
	insertDebt,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { getNow, substract } from "~utils/date";
import { t } from "~web/handlers/trpc";

import { procedure } from "./top";

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("currency.top", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			createCaller(context).procedure({ options: { type: "debts" } }),
		);
	});

	describe("functionality", () => {
		test("other account do not affect", async ({ ctx }) => {
			const { sessionId, userId } = await insertAccountWithSession(ctx);
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, userId, { currencyCode: "EUR" });
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "USD",
			});
			const { id: anotherUserId } = await insertUser(ctx, otherAccountId);
			await insertReceiptParticipant(ctx, receiptId, anotherUserId);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const debtsResult = await caller.procedure({
				options: { type: "debts" },
			});
			expect(debtsResult).toEqual<typeof debtsResult>([]);
			const receiptsResult = await caller.procedure({
				options: { type: "receipts" },
			});
			expect(receiptsResult).toEqual<typeof receiptsResult>([]);
		});

		test("top debts currencies returned", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { userId: otherUserId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "GEL" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherUserId, { currencyCode: "USD" });
			// Outdated debts
			const currencyCodes: CurrencyCode[] = ["GEL", "USD", "EUR"];
			await Promise.all(
				currencyCodes.map((currencyCode) =>
					insertDebt(ctx, accountId, otherUserId, {
						currencyCode,
						timestamp: substract(getNow(), { months: 1 }),
					}),
				),
			);
			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ options: { type: "debts" } });
			expect(result).toStrictEqual<typeof result>([
				{
					count: 3,
					currencyCode: "USD",
				},
				{
					count: 2,
					currencyCode: "EUR",
				},
				{
					count: 1,
					currencyCode: "GEL",
				},
			]);
		});

		test("top receipt currencies returned", async ({ ctx }) => {
			const { sessionId, accountId, userId } =
				await insertAccountWithSession(ctx);
			// Self receipts
			const { id: selfReceiptId } = await insertReceipt(ctx, accountId, {
				currencyCode: "USD",
			});
			await insertReceiptParticipant(ctx, selfReceiptId, userId);
			const { id: selfReceiptId2 } = await insertReceipt(ctx, accountId, {
				currencyCode: "GEL",
			});
			await insertReceiptParticipant(ctx, selfReceiptId2, userId);
			const { id: selfOutdatedReceiptId } = await insertReceipt(
				ctx,
				accountId,
				{
					currencyCode: "EUR",
					issued: substract(getNow(), { months: 1 }),
				},
			);
			await insertReceiptParticipant(ctx, selfOutdatedReceiptId, userId);
			// Foreign receipts
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			const [{ id: foreignUserId }] = await insertConnectedUsers(ctx, [
				otherAccountId,
				accountId,
			]);
			const { id: otherReceiptId } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "GEL",
			});
			await insertReceiptParticipant(ctx, otherReceiptId, foreignUserId);
			const { id: otherReceiptId2 } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "AMD",
			});
			await insertReceiptParticipant(ctx, otherReceiptId2, foreignUserId);
			const { id: otherOutdatedReceiptId } = await insertReceipt(
				ctx,
				otherAccountId,
				{
					currencyCode: "AMD",
					issued: substract(getNow(), { months: 1 }),
				},
			);
			await insertReceiptParticipant(
				ctx,
				otherOutdatedReceiptId,
				foreignUserId,
			);

			const caller = createCaller(await createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ options: { type: "receipts" } });
			expect(result).toStrictEqual<typeof result>([
				{
					count: 2,
					currencyCode: "GEL",
				},
				{
					count: 1,
					currencyCode: "AMD",
				},
				{
					count: 1,
					currencyCode: "USD",
				},
			]);
		});
	});
});
