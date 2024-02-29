import { sql } from "kysely";

import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptsId, UsersId } from "~db";
import { authProcedure } from "~web/handlers/trpc";

type ReceiptLocal = {
	id: ReceiptsId;
	name: string;
	issued: Date;
	sum: number;
	currencyCode: CurrencyCode;
};

export const procedure = authProcedure.query(async ({ ctx }) => {
	const { database } = ctx;
	const transferIntentions = await database
		.with("mergedIntentions", () => {
			const inboundTransferIntentions = database
				.selectFrom("receipts")
				.where("receipts.transferIntentionAccountId", "=", ctx.auth.accountId)
				.leftJoin("receiptItems", (qb) =>
					qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
				)
				.innerJoin("users", (qb) =>
					qb
						.onRef("users.connectedAccountId", "=", "receipts.ownerAccountId")
						.onRef(
							"users.ownerAccountId",
							"=",
							"receipts.transferIntentionAccountId",
						),
				)
				.select([
					"receipts.ownerAccountId",
					"receipts.id as receiptId",
					"receipts.name",
					"receipts.issued",
					"receipts.transferIntentionAccountId",
					"receipts.currencyCode",
					"users.id as userId",
					(eb) =>
						eb.fn
							.sum(
								eb.fn.coalesce(
									eb(
										"receiptItems.price",
										"*",
										eb.ref("receiptItems.quantity"),
									),
									sql`0`,
								),
							)
							.as("sum"),
				])
				.groupBy([
					"receipts.ownerAccountId",
					"receipts.id",
					"receipts.name",
					"receipts.issued",
					"receipts.transferIntentionAccountId",
					"receipts.currencyCode",
					"userId",
				]);
			const outboundTransferIntentions = database
				.selectFrom("receipts")
				.where("receipts.ownerAccountId", "=", ctx.auth.accountId)
				.where("receipts.transferIntentionAccountId", "is not", null)
				.leftJoin("receiptItems", (qb) =>
					qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
				)
				.innerJoin("users", (qb) =>
					qb
						.onRef(
							"users.connectedAccountId",
							"=",
							"receipts.transferIntentionAccountId",
						)
						.onRef("users.ownerAccountId", "=", "receipts.ownerAccountId"),
				)
				.select([
					"receipts.ownerAccountId",
					"receipts.id as receiptId",
					"receipts.name",
					"receipts.issued",
					"receipts.transferIntentionAccountId",
					"receipts.currencyCode",
					"users.id as userId",
					(eb) =>
						eb.fn
							.sum(
								eb.fn.coalesce(
									eb(
										"receiptItems.price",
										"*",
										eb.ref("receiptItems.quantity"),
									),
									sql`0`,
								),
							)
							.as("sum"),
				])
				.groupBy([
					"receipts.ownerAccountId",
					"receipts.id",
					"receipts.name",
					"receipts.issued",
					"receipts.transferIntentionAccountId",
					"receipts.currencyCode",
					"users.id",
				]);
			return inboundTransferIntentions.union(outboundTransferIntentions);
		})
		.selectFrom("mergedIntentions")
		.select([
			"mergedIntentions.ownerAccountId",
			"mergedIntentions.receiptId",
			"mergedIntentions.name",
			"mergedIntentions.issued",
			"mergedIntentions.userId",
			"mergedIntentions.sum",
			"mergedIntentions.currencyCode",
		])
		.orderBy(["issued desc", "receiptId"])
		.execute();
	return transferIntentions.reduce<{
		inbound: {
			receipt: ReceiptLocal;
			userId: UsersId;
		}[];
		outbound: {
			receipt: ReceiptLocal;
			userId: UsersId;
		}[];
	}>(
		(intentions, intention) => {
			const formattedIntention = {
				receipt: {
					id: intention.receiptId,
					name: intention.name,
					issued: intention.issued,
					sum: Number(intention.sum),
					currencyCode: intention.currencyCode,
				},
				userId: intention.userId,
			};
			if (intention.ownerAccountId === ctx.auth.accountId) {
				intentions.outbound.push(formattedIntention);
			} else {
				intentions.inbound.push(formattedIntention);
			}
			return intentions;
		},
		{
			outbound: [],
			inbound: [],
		},
	);
});
