import { sql } from "kysely";
import { z } from "zod";

import type { UsersId } from "next-app/db/models";
import type { Role } from "next-app/handlers/receipts/utils";
import { getForeignReceipts } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { limitSchema, offsetSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
			orderBy: z.union([z.literal("date-asc"), z.literal("date-desc")]),
			filters: z
				.strictObject({
					resolvedByMe: z.boolean().optional(),
					ownedByMe: z.boolean().optional(),
					locked: z.boolean().optional(),
				})
				.optional(),
		}),
	)
	.query(async ({ input: { filters = {}, ...input }, ctx }) => {
		const { database } = ctx;
		const foreignReceipts = getForeignReceipts(database, ctx.auth.accountId);
		const ownReceipts = database
			.selectFrom("receipts")
			.where("receipts.ownerAccountId", "=", ctx.auth.accountId);

		const [receipts, receiptsCount] = await Promise.all([
			database
				.with("mergedReceipts", () => {
					const foreignReceiptsBuilder = foreignReceipts.select([
						"receipts.id as receiptId",
						"receiptParticipants.role",
						"receipts.name",
						"receipts.issued",
						"receipts.currencyCode",
						"receipts.lockedTimestamp",
						"users.id as remoteUserId",
						sql`cast(null as uuid)`
							.$castTo<UsersId | null>()
							.as("transferIntentionUserId"),
					]);
					const ownReceiptsBuilder = ownReceipts
						.leftJoin("users as usersTransferIntention", (jb) =>
							jb
								.on(
									"usersTransferIntention.ownerAccountId",
									"=",
									ctx.auth.accountId,
								)
								.onRef(
									"usersTransferIntention.connectedAccountId",
									"=",
									"receipts.transferIntentionAccountId",
								),
						)
						.select([
							"receipts.id as receiptId",
							sql.lit("owner").$castTo<Role>().as("role"),
							"receipts.name",
							"receipts.issued",
							"receipts.currencyCode",
							"receipts.lockedTimestamp",
							// We use `userId` = `ownerAccountId` contract
							// But type system doesn't know about that
							sql
								.id("receipts", "ownerAccountId")
								.$castTo<UsersId>()
								.as("remoteUserId"),
							"usersTransferIntention.id as transferIntentionUserId",
						]);
					if (typeof filters.ownedByMe !== "boolean") {
						return foreignReceiptsBuilder.union(ownReceiptsBuilder);
					}
					if (filters.ownedByMe) {
						return ownReceiptsBuilder;
					}
					return foreignReceiptsBuilder;
				})
				.selectFrom("mergedReceipts")
				.leftJoin("receiptItems", (jb) =>
					jb.onRef("receiptItems.receiptId", "=", "mergedReceipts.receiptId"),
				)
				.leftJoin("receiptParticipants", (jb) =>
					jb
						.onRef(
							"receiptParticipants.receiptId",
							"=",
							"mergedReceipts.receiptId",
						)
						.onRef(
							"receiptParticipants.userId",
							"=",
							"mergedReceipts.remoteUserId",
						),
				)
				.select([
					"mergedReceipts.receiptId as id",
					"mergedReceipts.role",
					"mergedReceipts.name",
					"mergedReceipts.issued",
					"mergedReceipts.currencyCode",
					"mergedReceipts.lockedTimestamp",
					"receiptParticipants.resolved as participantResolved",
					"mergedReceipts.remoteUserId",
					"mergedReceipts.transferIntentionUserId",
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
					"mergedReceipts.receiptId",
					"mergedReceipts.role",
					"mergedReceipts.name",
					"mergedReceipts.issued",
					"mergedReceipts.currencyCode",
					"mergedReceipts.lockedTimestamp",
					"receiptParticipants.resolved",
					"mergedReceipts.transferIntentionUserId",
					"mergedReceipts.remoteUserId",
				])
				.orderBy(
					"mergedReceipts.issued",
					input.orderBy === "date-asc" ? "asc" : "desc",
				)
				// Stable order for receipts with the same date
				.orderBy("mergedReceipts.receiptId")
				.$if(typeof filters.resolvedByMe === "boolean", (qb) =>
					qb.where(
						"receiptParticipants.resolved",
						"=",
						Boolean(filters.resolvedByMe),
					),
				)
				.$if(typeof filters.locked === "boolean", (qb) =>
					qb.where(
						"mergedReceipts.lockedTimestamp",
						filters.locked ? "is not" : "is",
						null,
					),
				)
				.offset(input.cursor)
				.limit(input.limit + 1)
				.execute(),
			database
				.with("mergedReceipts", () => {
					const foreignReceiptsBuilder = foreignReceipts
						.select([
							database.fn.count<string>("receipts.id").as("amount"),
							sql
								.id("receiptParticipants", "resolved")
								.$castTo<boolean | null>()
								.as("resolved"),
							"receipts.lockedTimestamp",
						])
						.groupBy([
							"receiptParticipants.resolved",
							"receipts.lockedTimestamp",
						]);
					const ownReceiptsBuilder = ownReceipts
						.leftJoin("receiptParticipants", (jb) =>
							jb
								.onRef("receiptParticipants.receiptId", "=", "receipts.id")
								.onRef(
									"receiptParticipants.userId",
									"=",
									// We use `userId` = `ownerAccountId` contract
									// But type system doesn't know about that
									sql.id("receipts", "ownerAccountId").$castTo<UsersId>(),
								),
						)
						.select([
							database.fn.count<string>("receipts.id").as("amount"),
							"receiptParticipants.resolved",
							"receipts.lockedTimestamp",
						])
						.groupBy([
							"receiptParticipants.resolved",
							"receipts.lockedTimestamp",
						]);
					if (typeof filters.ownedByMe !== "boolean") {
						return foreignReceiptsBuilder.union(ownReceiptsBuilder);
					}
					if (filters.ownedByMe) {
						return ownReceiptsBuilder;
					}
					return foreignReceiptsBuilder;
				})
				.selectFrom("mergedReceipts")
				.select(database.fn.sum<string>("amount").as("amount"))
				.$if(typeof filters.resolvedByMe === "boolean", (qb) =>
					qb.where(
						"mergedReceipts.resolved",
						"=",
						Boolean(filters.resolvedByMe),
					),
				)
				.$if(typeof filters.locked === "boolean", (qb) =>
					qb.where(
						"mergedReceipts.lockedTimestamp",
						filters.locked ? "is not" : "is",
						null,
					),
				)
				.executeTakeFirst(),
		]);

		return {
			count: receiptsCount?.amount ? parseInt(receiptsCount.amount, 10) : 0,
			hasMore: receipts.length === input.limit + 1,
			cursor: input.cursor,
			items: receipts
				.slice(0, input.limit)
				.map(
					({ lockedTimestamp, sum, transferIntentionUserId, ...receipt }) => ({
						...receipt,
						transferIntentionUserId: transferIntentionUserId || undefined,
						sum: Number(sum),
						lockedTimestamp: lockedTimestamp || undefined,
					}),
				),
		};
	});
