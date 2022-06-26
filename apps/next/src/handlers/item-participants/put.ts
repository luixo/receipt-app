import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptItemsId, UsersId } from "../../db/models";
import { getAccessRole, getReceiptById } from "../receipts/utils";
import { AuthorizedContext } from "../context";
import { getReceiptItemById } from "../receipt-items/utils";
import { flavored } from "../zod";
import { getUserById } from "../users/utils";
import { getReceiptParticipant } from "../receipt-participants/utils";
import { getItemParticipant } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
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
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== receipt.ownerAccountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} is not owned by receipt owner ${receipt.ownerAccountId}.`,
			});
		}
		const participant = await getReceiptParticipant(
			database,
			input.userId,
			receipt.id,
			["role"]
		);
		if (!participant) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User ${input.userId} does not participate in receipt ${receipt.id}.`,
			});
		}
		const itemPart = await getItemParticipant(
			database,
			input.userId,
			input.itemId,
			["part"]
		);
		if (itemPart) {
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `User ${input.userId} already has a part in item ${input.itemId}.`,
			});
		}
		await database
			.insertInto("item_participants")
			.values({
				userId: input.userId,
				itemId: input.itemId,
				part: "1",
			})
			.execute();
	},
});
