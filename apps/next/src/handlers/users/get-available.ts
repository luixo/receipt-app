import * as trpc from "@trpc/server";
import { z } from "zod";

import { MONTH } from "app/utils/time";
import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { limitSchema, receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get-available", {
	input: z.strictObject({
		cursor: z.number().optional(),
		limit: limitSchema,
		receiptId: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"id",
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole !== "owner") {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to modify receipt ${input.receiptId}.`,
			});
		}
		const availableUsers = database
			.selectFrom("users")
			.where("users.ownerAccountId", "=", ctx.auth.accountId)
			.where("users.id", "not in", (eb) =>
				eb
					.selectFrom("receiptParticipants")
					.innerJoin("users", (jb) =>
						jb.onRef("users.id", "=", "receiptParticipants.userId")
					)
					.where("receiptParticipants.receiptId", "=", input.receiptId)
					.select("users.id")
			);
		const [users, usersCount] = await Promise.all([
			database
				.with("orderedUsers", () =>
					availableUsers
						.leftJoin("receiptParticipants", (qb) =>
							qb.onRef("receiptParticipants.userId", "=", "users.id")
						)
						.leftJoin("receipts", (qb) =>
							qb
								.onRef("receiptParticipants.receiptId", "=", "receipts.id")
								.on("receipts.issued", ">", new Date(Date.now() - MONTH))
						)
						.distinctOn(["users.id"])
						.select([
							"users.id",
							database.fn
								.count<string>("receiptParticipants.userId")
								.as("count"),
							database.fn.count<string>("receipts.id").as("latestCount"),
							"users.name",
							"users.publicName",
							"users.connectedAccountId",
						])
						.groupBy("users.id")
						.orderBy("users.id")
				)
				.selectFrom("orderedUsers")
				.select([
					"id",
					"name",
					"publicName",
					"connectedAccountId",
					"count",
					"latestCount",
				])
				.orderBy("latestCount", "desc")
				.orderBy("count", "desc")
				.if(Boolean(input.cursor), (qb) => qb.offset(input.cursor!))
				.limit(input.limit + 1)
				.execute(),
			availableUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(usersCount.amount, 10),
			hasMore: users.length === input.limit + 1,
			topAmount: users.filter((user) => user.latestCount !== "0").length,
			items: users
				.slice(0, input.limit)
				.map(({ latestCount, count, ...user }) => ({
					...user,
					participatedInReceipts: Number(count),
				})),
		};
	},
});
