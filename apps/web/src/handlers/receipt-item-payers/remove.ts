import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getAccessRole } from "~web/handlers/receipts/utils";
import { authProcedure } from "~web/handlers/trpc";
import { peerIdSchema, receiptItemIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.meta({
		title: "Remove receipt item payer",
		description: "Removes a peerId as a payer of a given receipt item.",
	})
	.input(
		z.strictObject({
			itemId: receiptItemIdSchema,
			peerId: peerIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receiptItems")
			.where("receiptItems.id", "=", input.itemId)
			.innerJoin("receipts", (qb) =>
				qb.onRef("receipts.id", "=", "receiptItems.receiptId"),
			)
			.innerJoin("accounts", (qb) =>
				qb.onRef("accounts.id", "=", "receipts.ownerAccountId"),
			)
			.select(["receipts.id", "receipts.ownerAccountId"])
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt item "${input.itemId}" does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to remove payer from item from receipt "${receipt.id}".`,
			});
		}
		const deleteResult = await database
			.deleteFrom("receiptItemPayers")
			.where((eb) =>
				eb.and({
					itemId: input.itemId,
					peerId: input.peerId,
				}),
			)
			.returning("receiptItemPayers.peerId")
			.executeTakeFirst();
		if (!deleteResult) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Peer "${input.peerId}" does not pay for item "${input.itemId}" on receipt "${receipt.id}" doesn't exist.`,
			});
		}
	});
