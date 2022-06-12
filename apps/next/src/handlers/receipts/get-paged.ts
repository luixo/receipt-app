import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "../../db";
import { UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().query("get-paged", {
	input: z.strictObject({
		cursor: z.number().nullish(),
		limit: z.number(),
		orderBy: z.union([z.literal("date-asc"), z.literal("date-desc")]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipts = await database
			.with("mergedReceipts", (db) => {
				return db
					.selectFrom("accounts")
					.innerJoin("users", (jb) =>
						jb.onRef("users.connectedAccountId", "=", "accounts.id")
					)
					.innerJoin("receipt_participants", (jb) =>
						jb.onRef("receipt_participants.userId", "=", "users.id")
					)
					.innerJoin("receipts", (jb) =>
						jb.onRef("receipts.id", "=", "receipt_participants.receiptId")
					)
					.where("accounts.id", "=", ctx.auth.accountId)
					.where("receipts.ownerAccountId", "<>", ctx.auth.accountId)
					.select([
						"receipts.id as receiptId",
						"receipts.name",
						"receipts.issued",
						"receipts.currency",
						"receipts.resolved",
						"users.connectedAccountId as accountId",
						"users.id as userId",
					])
					.union(
						db
							.selectFrom("receipts")
							.where("ownerAccountId", "=", ctx.auth.accountId)
							.select([
								"receipts.id as receiptId",
								"receipts.name",
								"receipts.issued",
								"receipts.currency",
								"receipts.resolved",
								"receipts.ownerAccountId as accountId",
								// We use `userId` = `ownerAccountId` contract
								// But type system doesn't know about that
								sql<UsersId>`receipts."ownerAccountId"`.as("userId"),
							])
							.groupBy("receipts.id")
					);
			})
			.selectFrom("mergedReceipts")
			.leftJoin("receipt_participants", (jb) =>
				jb
					.onRef(
						"receipt_participants.receiptId",
						"=",
						"mergedReceipts.receiptId"
					)
					.onRef("receipt_participants.userId", "=", "mergedReceipts.userId")
			)
			.select([
				"mergedReceipts.receiptId as id",
				"name",
				"issued",
				"currency",
				"mergedReceipts.resolved as receiptResolved",
				"receipt_participants.resolved as participantResolved",
			])
			.offset(input.cursor || 0)
			.limit(input.limit)
			.orderBy("issued", input.orderBy === "date-asc" ? "asc" : "desc")
			.execute();
		return receipts;
	},
});
