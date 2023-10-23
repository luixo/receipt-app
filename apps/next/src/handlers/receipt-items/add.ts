import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import type { ReceiptItemsId } from "next-app/db/models";
import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			name: receiptItemNameSchema,
			price: priceSchema,
			quantity: quantitySchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
			"id",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.receiptId}`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.receiptId} cannot be updated while locked.`,
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
		const id: ReceiptItemsId = ctx.getUuid();
		await database
			.insertInto("receiptItems")
			.values({
				id,
				name: input.name,
				price: input.price.toString(),
				quantity: input.quantity.toString(),
				receiptId: input.receiptId,
			})
			.executeTakeFirst();
		return id;
	});
