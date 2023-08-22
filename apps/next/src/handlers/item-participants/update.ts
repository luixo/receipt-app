import * as trpc from "@trpc/server";
import { z } from "zod";

import { partSchema } from "app/utils/validation";
import type { SimpleUpdateObject } from "next-app/db/types";
import { getItemParticipant } from "next-app/handlers/item-participants/utils";
import { getReceiptItemById } from "next-app/handlers/receipt-items/utils";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import {
	receiptItemIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			itemId: receiptItemIdSchema,
			userId: userIdSchema,
			update: z.strictObject({
				type: z.literal("part"),
				part: partSchema,
			}),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
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
			ctx.auth.accountId,
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
			["userId"],
		);
		if (!itemParticipant) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not participate in item ${input.itemId} of the receipt ${receiptItem.receiptId}.`,
			});
		}
		let setObject: SimpleUpdateObject<"itemParticipants"> = {};
		switch (input.update.type) {
			case "part":
				setObject = { part: input.update.part.toString() };
				break;
		}
		await database
			.updateTable("itemParticipants")
			.set(setObject)
			.where("userId", "=", input.userId)
			.where("itemId", "=", input.itemId)
			.executeTakeFirst();
	});
