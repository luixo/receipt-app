import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import {
	priceSchema,
	quantitySchema,
	receiptItemNameSchema,
} from "app/utils/validation";
import { ReceiptsDatabase, getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getReceiptItemById } from "next-app/handlers/receipt-items/utils";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { receiptItemIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
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
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receiptItem = await getReceiptItemById(database, input.id, [
			"receiptId",
		]);
		if (!receiptItem) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt item found by id ${input.id}`,
			});
		}
		const receipt = await getReceiptById(database, receiptItem.receiptId, [
			"id",
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (accessRole !== "owner" && accessRole !== "editor") {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${receipt.id} is not allowed to be modified by ${
					ctx.auth.accountId
				} with role ${accessRole || "nobody"}`,
			});
		}
		let setObject: MutationObject<
			ReceiptsDatabase,
			"receiptItems",
			"receiptItems"
		> = {};
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
		await getDatabase(ctx)
			.updateTable("receiptItems")
			.set(setObject)
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
