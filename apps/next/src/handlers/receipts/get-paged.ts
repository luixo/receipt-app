import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import {
	getOwnReceipts,
	getForeignReceipts,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { limitSchema, offsetSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			cursor: offsetSchema,
			limit: limitSchema,
			orderBy: z.union([z.literal("date-asc"), z.literal("date-desc")]),
			onlyNonResolved: z.boolean(),
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const foreignReceipts = getForeignReceipts(database, ctx.auth.accountId);
		const ownReceipts = getOwnReceipts(database, ctx.auth.accountId);

		const [receipts, receiptsCount] = await Promise.all([
			database
				.with("mergedReceipts", () =>
					foreignReceipts
						.select([
							"receipts.id as receiptId",
							"receiptParticipants.role",
							"receipts.name",
							"receipts.issued",
							"receipts.currency",
							"receipts.lockedTimestamp",
							"users.id as remoteUserId",
							// We use `userId` = `ownerAccountId` contract
							// But type system doesn't know about that
							sql<UsersId>`users."connectedAccountId"`.as("localUserId"),
						])
						.union(
							ownReceipts.select([
								"receipts.id as receiptId",
								sql<string>`'owner'`.as("role"),
								"receipts.name",
								"receipts.issued",
								"receipts.currency",
								"receipts.lockedTimestamp",
								// We use `userId` = `ownerAccountId` contract
								// But type system doesn't know about that
								sql<UsersId>`receipts."ownerAccountId"`.as("remoteUserId"),
								sql<UsersId>`receipts."ownerAccountId"`.as("localUserId"),
							])
						)
				)
				.selectFrom("mergedReceipts")
				.leftJoin("receiptParticipants", (jb) =>
					jb
						.onRef(
							"receiptParticipants.receiptId",
							"=",
							"mergedReceipts.receiptId"
						)
						.onRef(
							"receiptParticipants.userId",
							"=",
							"mergedReceipts.remoteUserId"
						)
				)
				.select([
					"mergedReceipts.receiptId as id",
					"mergedReceipts.role",
					"name",
					"issued",
					"currency",
					"mergedReceipts.lockedTimestamp",
					"receiptParticipants.resolved as participantResolved",
					"mergedReceipts.remoteUserId",
					"mergedReceipts.localUserId",
				])
				.orderBy("issued", input.orderBy === "date-asc" ? "asc" : "desc")
				.if(Boolean(input.onlyNonResolved), (qb) =>
					qb.where("receiptParticipants.resolved", "=", false)
				)
				.offset(input.cursor)
				.limit(input.limit + 1)
				.execute(),
			database
				.with("mergedReceipts", () =>
					foreignReceipts
						.select([
							database.fn.count<string>("receipts.id").as("amount"),
							sql<boolean | null>`"receiptParticipants"."resolved"`.as(
								"resolved"
							),
						])
						.groupBy("receiptParticipants.resolved")
						.union(
							ownReceipts
								.leftJoin("receiptParticipants", (jb) =>
									jb
										.onRef("receiptParticipants.receiptId", "=", "receipts.id")
										.onRef(
											"receiptParticipants.userId",
											"=",
											// We use `userId` = `ownerAccountId` contract
											// But type system doesn't know about that
											sql<UsersId>`receipts."ownerAccountId"`
										)
								)
								.select([
									database.fn.count<string>("receipts.id").as("amount"),
									"receiptParticipants.resolved",
								])
								.groupBy("receiptParticipants.resolved")
						)
				)
				.selectFrom("mergedReceipts")
				.select(database.fn.sum<string>("amount").as("amount"))
				.if(Boolean(input.onlyNonResolved), (qb) =>
					qb.where("resolved", "=", false)
				)
				.executeTakeFirst(),
		]);

		return {
			count: receiptsCount?.amount ? parseInt(receiptsCount.amount, 10) : 0,
			hasMore: receipts.length === input.limit + 1,
			cursor: input.cursor,
			items: receipts
				.slice(0, input.limit)
				.map(({ lockedTimestamp, ...receipt }) => ({
					...receipt,
					locked: Boolean(lockedTimestamp),
				})),
		};
	});
