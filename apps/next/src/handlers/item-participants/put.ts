import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptItemById } from "next-app/handlers/receipt-items/utils";
import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { verifyUsersByIds } from "next-app/handlers/users/utils";
import {
	receiptItemIdSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		itemId: receiptItemIdSchema,
		userIds: z.array(userIdSchema).nonempty(),
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
		await verifyUsersByIds(database, input.userIds, receipt.ownerAccountId);
		const receiptParticipants = await database
			.selectFrom("receiptParticipants")
			.where("receiptId", "=", receipt.id)
			.where("userId", "in", input.userIds)
			.select(["userId"])
			.execute();
		if (receiptParticipants.length !== input.userIds.length) {
			const participatingUserIds = receiptParticipants.map(
				({ userId }) => userId
			);
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `User(s) ${input.userIds
					.filter((id) => participatingUserIds.includes(id))
					.join(", ")} do(es)n't participate in receipt ${receipt.id}.`,
			});
		}
		const itemParts = await database
			.selectFrom("itemParticipants")
			.where("itemId", "=", input.itemId)
			.where("userId", "in", input.userIds)
			.select(["part", "userId"])
			.execute();
		if (itemParts.length !== 0) {
			const userWithParts = itemParts.map(({ userId }) => userId);
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `User(s) ${userWithParts.join(
					", "
				)} already have / has a part in item ${input.itemId}.`,
			});
		}
		await database
			.insertInto("itemParticipants")
			.values(
				input.userIds.map((userId) => ({
					userId,
					itemId: input.itemId,
					part: "1",
				}))
			)
			.execute();
	},
});
