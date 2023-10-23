import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import type { SimpleUpdateObject } from "next-app/db/types";
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
			update: z.discriminatedUnion("type", [
				z.strictObject({
					type: z.literal("name"),
					name: receiptItemNameSchema,
				}),
				z.strictObject({ type: z.literal("price"), price: priceSchema }),
				z.strictObject({
					type: z.literal("quantity"),
					quantity: quantitySchema,
				}),
				z.strictObject({ type: z.literal("locked"), locked: z.boolean() }),
			]),
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
		if (receipt.lockedTimestamp && input.update.type !== "locked") {
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
		let setObject: SimpleUpdateObject<"receiptItems"> = {};
		switch (input.update.type) {
			case "name":
				setObject = { name: input.update.name };
				break;
			case "price":
				setObject = { price: input.update.price.toString() };
				break;
			case "quantity":
				setObject = { quantity: input.update.quantity.toString() };
				break;
			case "locked":
				setObject = { locked: input.update.locked };
				break;
		}
		await database
			.updateTable("receiptItems")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	});
