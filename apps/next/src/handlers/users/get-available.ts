import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import {
	limitSchema,
	receiptIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get-available", {
	input: z.strictObject({
		cursor: userIdSchema.optional(),
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
			availableUsers
				.select(["id", "name", "publicName", "connectedAccountId"])
				.orderBy("id")
				.if(Boolean(input.cursor), (qb) => qb.where("id", ">", input.cursor!))
				.limit(input.limit + 1)
				.execute(),
			availableUsers
				.select(database.fn.count<string>("id").as("amount"))
				.executeTakeFirstOrThrow(),
		]);

		return {
			count: parseInt(usersCount.amount, 10),
			hasMore: users.length === input.limit + 1,
			items: users.slice(0, input.limit),
		};
	},
});
