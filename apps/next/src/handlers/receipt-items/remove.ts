import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getReceiptItemById } from "next-app/handlers/receipt-items/utils";
import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptItemIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptItemIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receiptItem = await getReceiptItemById(database, input.id, [
			"receiptId",
		]);
		if (!receiptItem) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt item found by id ${input.id}`,
			});
		}
		const receipt = await getReceiptById(database, receiptItem.receiptId, [
			"id",
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
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
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${receipt.id} is not allowed to be modified by ${
					ctx.auth.accountId
				} with role ${accessRole || "nobody"}`,
			});
		}
		await database
			.deleteFrom("receiptItems")
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
