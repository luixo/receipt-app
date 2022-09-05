import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptItemById } from "next-app/handlers/receipt-items/utils";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import {
	receiptItemIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("remove", {
	input: z.strictObject({
		itemId: receiptItemIdSchema,
		userId: userIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receiptItem = await getReceiptItemById(database, input.itemId, [
			"receiptId",
		]);
		if (!receiptItem) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Item ${input.itemId} does not exist.`,
			});
		}
		const receipt = await getReceiptById(database, receiptItem.receiptId, [
			"id",
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${receiptItem.receiptId} does not exist.`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${receiptItem.receiptId} cannot be updated while locked.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to modify receipt ${receiptItem.receiptId}.`,
			});
		}
		const deleteResult = await database
			.deleteFrom("itemParticipants")
			.where("itemId", "=", input.itemId)
			.where("userId", "=", input.userId)
			.returning("itemParticipants.userId")
			.executeTakeFirst();
		if (!deleteResult) {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Item participant ${input.userId} on item ${input.itemId} on receipt ${receipt.id} doesn't exist.`,
			});
		}
	},
});
