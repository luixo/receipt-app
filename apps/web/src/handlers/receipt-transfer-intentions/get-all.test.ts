import type { inferProcedureOutput } from "@trpc/server";
import { describe, expect } from "vitest";

import { createAuthContext } from "~tests/backend/utils/context";
import {
	insertAccount,
	insertAccountWithSession,
	insertConnectedUsers,
	insertReceipt,
	insertReceiptItem,
} from "~tests/backend/utils/data";
import { expectUnauthorizedError } from "~tests/backend/utils/expect";
import { test } from "~tests/backend/utils/test";
import { MONTH } from "~utils";
import { t } from "~web/handlers/trpc";

import { procedure } from "./get-all";

type TransferIntention = inferProcedureOutput<
	typeof procedure
>["inbound"][number];

const sortTransferIntentions = (
	a: TransferIntention,
	b: TransferIntention,
): number => {
	const aIssued = a.receipt.issued.valueOf();
	const bIssued = b.receipt.issued.valueOf();
	if (aIssued === bIssued) {
		return a.receipt.id.localeCompare(b.receipt.id);
	}
	return bIssued - aIssued;
};

const sumItems = (items: Awaited<ReturnType<typeof insertReceiptItem>>[]) =>
	items.reduce(
		(sum, item) => sum + Number(item.price) * Number(item.quantity),
		0,
	);

const createCaller = t.createCallerFactory(t.router({ procedure }));

describe("receiptTransferIntentions.getAll", () => {
	describe("input verification", () => {
		expectUnauthorizedError((context) => createCaller(context).procedure());
	});

	describe("functionality", () => {
		test("return empty arrays", async ({ ctx }) => {
			const { sessionId } = await insertAccountWithSession(ctx);
			const { id: foreignAccountId } = await insertAccount(ctx);
			const { id: anotherAccountId } = await insertAccount(ctx);

			// Verify other intention are not show in the query
			await insertReceipt(ctx, foreignAccountId, {
				transferIntentionAccountId: anotherAccountId,
			});

			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			await expect(result).toStrictEqual<typeof result>({
				inbound: [],
				outbound: [],
			});
		});

		test("returns receipt transfer intentions", async ({ ctx }) => {
			const { sessionId, accountId } = await insertAccountWithSession(ctx);
			const inboundAccount = await insertAccount(ctx);
			const outboundAccount = await insertAccount(ctx);
			const anotherOutboundAccount = await insertAccount(ctx);

			// Adding outbound intentions
			await insertReceipt(ctx, accountId);
			const [outboundUser] = await insertConnectedUsers(ctx, [
				accountId,
				outboundAccount.id,
			]);
			const outboundReceipt = await insertReceipt(ctx, accountId, {
				transferIntentionAccountId: outboundAccount.id,
			});
			const outboundReceiptItems = await Promise.all([
				insertReceiptItem(ctx, outboundReceipt.id),
				insertReceiptItem(ctx, outboundReceipt.id),
			]);
			const [anotherOutboundUser] = await insertConnectedUsers(ctx, [
				accountId,
				anotherOutboundAccount.id,
			]);
			const anotherOutboundReceipt = await insertReceipt(ctx, accountId, {
				transferIntentionAccountId: anotherOutboundAccount.id,
			});

			// Adding inbound intentions
			const [inboundAccountUser] = await insertConnectedUsers(ctx, [
				accountId,
				inboundAccount.id,
			]);
			const inboundReceipt = await insertReceipt(ctx, inboundAccount.id, {
				transferIntentionAccountId: accountId,
				issued: new Date(Date.now() - MONTH),
			});
			const inboundReceiptItems = await Promise.all([
				insertReceiptItem(ctx, inboundReceipt.id),
				insertReceiptItem(ctx, inboundReceipt.id),
			]);
			const anotherInboundReceipt = await insertReceipt(
				ctx,
				inboundAccount.id,
				{
					transferIntentionAccountId: accountId,
				},
			);

			// Adding some noise
			await insertReceipt(ctx, accountId);
			await insertReceipt(ctx, inboundAccount.id);
			await insertReceipt(ctx, inboundAccount.id, {
				transferIntentionAccountId: outboundAccount.id,
			});
			await insertReceipt(ctx, outboundAccount.id);
			await insertReceipt(ctx, outboundAccount.id, {
				transferIntentionAccountId: inboundAccount.id,
			});

			// Verifying
			const caller = createCaller(createAuthContext(ctx, sessionId));
			const result = await caller.procedure();
			await expect(result).toStrictEqual<typeof result>({
				inbound: [
					{
						userId: inboundAccountUser.id,
						receipt: {
							id: inboundReceipt.id,
							name: inboundReceipt.name,
							issued: inboundReceipt.issued,
							currencyCode: inboundReceipt.currencyCode,
							sum: sumItems(inboundReceiptItems),
						},
					},
					{
						userId: inboundAccountUser.id,
						receipt: {
							id: anotherInboundReceipt.id,
							name: anotherInboundReceipt.name,
							issued: anotherInboundReceipt.issued,
							currencyCode: anotherInboundReceipt.currencyCode,
							sum: 0,
						},
					},
				].sort(sortTransferIntentions),
				outbound: [
					{
						receipt: {
							id: outboundReceipt.id,
							name: outboundReceipt.name,
							issued: outboundReceipt.issued,
							currencyCode: outboundReceipt.currencyCode,
							sum: sumItems(outboundReceiptItems),
						},
						userId: outboundUser.id,
					},
					{
						receipt: {
							id: anotherOutboundReceipt.id,
							name: anotherOutboundReceipt.name,
							issued: anotherOutboundReceipt.issued,
							currencyCode: anotherOutboundReceipt.currencyCode,
							sum: 0,
						},
						userId: anotherOutboundUser.id,
					},
				].sort(sortTransferIntentions),
			});
		});
	});
});
