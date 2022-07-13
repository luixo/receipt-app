import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { UsersId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc.router<AuthorizedContext>().query("get-paged", {
	input: z.strictObject({
		cursor: z.number().nullish(),
		limit: z.number(),
		orderBy: z.union([z.literal("date-asc"), z.literal("date-desc")]),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipts = await database
			.with("mergedReceipts", (db) =>
				db
					.selectFrom("accounts")
					.innerJoin("users", (jb) =>
						jb.onRef("users.connectedAccountId", "=", "accounts.id")
					)
					.innerJoin("receiptParticipants", (jb) =>
						jb.onRef("receiptParticipants.userId", "=", "users.id")
					)
					.innerJoin("receipts", (jb) =>
						jb.onRef("receipts.id", "=", "receiptParticipants.receiptId")
					)
					.where("accounts.id", "=", ctx.auth.accountId)
					.where("receipts.ownerAccountId", "<>", ctx.auth.accountId)
					.select([
						"receipts.id as receiptId",
						"receiptParticipants.role",
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
								sql<string>`'owner'`.as("role"),
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
					.onRef("receiptParticipants.userId", "=", "mergedReceipts.userId")
			)
			.select([
				"mergedReceipts.receiptId as id",
				"mergedReceipts.role",
				"name",
				"issued",
				"currency",
				"mergedReceipts.resolved as receiptResolved",
				"receiptParticipants.resolved as participantResolved",
			])
			.orderBy("issued", input.orderBy === "date-asc" ? "asc" : "desc")
			.offset(input.cursor || 0)
			.limit(input.limit)
			.execute();

		return receipts;
	},
});
