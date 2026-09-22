import { describe, expect } from "vitest";

import type { CurrencyCode } from "~app/utils/currency";
import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccountWithSession,
	insertConnectedPeers,
	insertDebt,
	insertPeer,
	insertReceipt,
	insertReceiptParticipant,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
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
			const { sessionId, peerId } = await insertAccountWithSession(ctx);
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, otherAccountId, peerId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, peerId, { currencyCode: "USD" });
			await insertDebt(ctx, otherAccountId, peerId, { currencyCode: "EUR" });
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "USD",
			});
			const { id: anotherPeerId } = await insertPeer(ctx, otherAccountId);
			await insertReceiptParticipant(ctx, receiptId, anotherPeerId);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const debtsResult = await caller.procedure({
				options: { type: "debts" },
			});
			expect(debtsResult).toStrictEqual<typeof debtsResult>({ items: [] });
			const receiptsResult = await caller.procedure({
				options: { type: "receipts" },
			});
			expect(receiptsResult).toStrictEqual<typeof receiptsResult>({
				items: [],
			});
		});

		test("top debts currencies returned", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const { peerId: otherPeerId } = await insertAccountWithSession(ctx);
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "GEL" });
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "EUR" });
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "USD" });
			await insertDebt(ctx, accountId, otherPeerId, { currencyCode: "USD" });
			// Outdated debts
			const currencyCodes: CurrencyCode[] = ["GEL", "USD", "EUR"];
			await Promise.all(
				currencyCodes.map((currencyCode) =>
					insertDebt(ctx, accountId, otherPeerId, {
						currencyCode,
						timestamp: Temporal.Now.plainDateISO().subtract({ months: 1 }),
					}),
				),
			);
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ options: { type: "debts" } });
			expect(result).toStrictEqual<typeof result>({
				items: [
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
				],
			});
		});

		test("top receipt currencies returned", async ({ ctx }) => {
			const { sessionId, accountId, peerId } =
				await insertAccountWithSession(ctx);
			// Self receipts
			const { id: selfReceiptId } = await insertReceipt(ctx, accountId, {
				currencyCode: "USD",
			});
			await insertReceiptParticipant(ctx, selfReceiptId, peerId);
			const { id: selfReceiptId2 } = await insertReceipt(ctx, accountId, {
				currencyCode: "GEL",
			});
			await insertReceiptParticipant(ctx, selfReceiptId2, peerId);
			const { id: selfOutdatedReceiptId } = await insertReceipt(
				ctx,
				accountId,
				{
					currencyCode: "EUR",
					issued: Temporal.Now.plainDateISO().subtract({ months: 1 }),
				},
			);
			await insertReceiptParticipant(ctx, selfOutdatedReceiptId, peerId);
			// Foreign receipts
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			const [{ id: foreignPeerId }] = await insertConnectedPeers(ctx, [
				otherAccountId,
				accountId,
			]);
			const { id: otherReceiptId } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "GEL",
			});
			await insertReceiptParticipant(ctx, otherReceiptId, foreignPeerId);
			const { id: otherReceiptId2 } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "AMD",
			});
			await insertReceiptParticipant(ctx, otherReceiptId2, foreignPeerId);
			const { id: otherOutdatedReceiptId } = await insertReceipt(
				ctx,
				otherAccountId,
				{
					currencyCode: "AMD",
					issued: Temporal.Now.plainDateISO().subtract({ months: 1 }),
				},
			);
			await insertReceiptParticipant(
				ctx,
				otherOutdatedReceiptId,
				foreignPeerId,
			);

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure({ options: { type: "receipts" } });
			expect(result).toStrictEqual<typeof result>({
				items: [
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
				],
			});
		});
	});
});
