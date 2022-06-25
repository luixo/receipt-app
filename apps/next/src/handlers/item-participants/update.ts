import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { ReceiptsDatabase, getDatabase } from "../../db";
import { AuthorizedContext } from "../context";
import { getReceiptById, getAccessRole } from "../receipts/utils";
import { getReceiptItemById } from "../receipt-items/utils";
import { flavored } from "../zod";
import { ReceiptItemsId, UsersId } from "../../db/models";
import { getUserById } from "../users/utils";
import { getItemParticipant } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		itemId: z.string().uuid().refine<ReceiptItemsId>(flavored),
		userId: z.string().uuid().refine<UsersId>(flavored),
		update: z.strictObject({
			type: z.literal("part"),
			part: z.number().gt(0),
		}),
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
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		const itemParticipant = await getItemParticipant(
			database,
			input.userId,
			input.itemId,
			["userId"]
		);
		if (!itemParticipant) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not participate in item ${input.itemId} of the receipt ${receiptItem.receiptId}.`,
			});
		}
		let setObject: MutationObject<
			ReceiptsDatabase,
			"item_participants",
			"item_participants"
		> = {};
		switch (input.update.type) {
			case "part":
				setObject = { part: input.update.part.toString() };
				break;
		}
		await getDatabase(ctx)
			.updateTable("item_participants")
			.set(setObject)
			.where("userId", "=", input.userId)
			.where("itemId", "=", input.itemId)
			.executeTakeFirst();
	},
});
