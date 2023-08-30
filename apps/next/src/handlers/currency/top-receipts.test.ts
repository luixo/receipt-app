import { describe, expect } from "vitest";

import { MONTH } from "app/utils/time";
import { t } from "next-app/handlers/trpc";
import { createAuthContext } from "next-tests/utils/context";
import {
	insertAccountWithSession,
	insertReceipt,
	insertReceiptParticipant,
	insertUser,
} from "next-tests/utils/data";
import { expectUnauthorizedError } from "next-tests/utils/expect";
import { test } from "next-tests/utils/test";

import { procedure } from "./top-receipts";

const router = t.router({ procedure });

describe("currency.rates", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) =>
			router.createCaller(context).procedure(),
		);
	});

	describe("functionality", () => {
		test("other account do not affect", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			const { id: receiptId } = await insertReceipt(ctx, otherAccountId, {
				currencyCode: "USD",
			});
			const { id: userId } = await insertUser(ctx, otherAccountId);
			await insertReceiptParticipant(ctx, receiptId, userId);
			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toEqual<typeof result>([]);
		});

		test("top receipt currencies returned", async ({ ctx }) => {
			const { sessionId, accountId, userId } = await insertAccountWithSession(
				ctx,
			);
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
					issued: new Date(Date.now() - MONTH),
				},
			);
			await insertReceiptParticipant(ctx, selfOutdatedReceiptId, userId);
			// Foreign receipts
			const { accountId: otherAccountId } = await insertAccountWithSession(ctx);
			const { id: foreignUserId } = await insertUser(ctx, otherAccountId, {
				connectedAccountId: accountId,
			});
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
					issued: new Date(Date.now() - MONTH),
				},
			);
			await insertReceiptParticipant(
				ctx,
				otherOutdatedReceiptId,
				foreignUserId,
			);

			const caller = router.createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			expect(result).toMatchSnapshot();
		});
	});
});
