import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptItemsId, UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getReceiptItemById } from "../receipt-items/utils";
import { getReceiptById, getAccessRole } from "../receipts/utils";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		itemId: z.string().uuid().refine<ReceiptItemsId>(flavored),
		userId: z.string().uuid().refine<UsersId>(flavored),
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
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${receiptItem.receiptId} does not exist.`,
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
