import * as trpc from "@trpc/server";
import { MutationObject } from "kysely";
import { z } from "zod";

import { ReceiptsDatabase, getDatabase } from "../../db";
import { AuthorizedContext } from "../context";
import { getReceiptById, getAccessRole } from "../receipts/utils";
import { getReceiptItemById } from "./utils";
import { flavored } from "../zod";
import { ReceiptItemsId } from "../../db/models";

export const router = trpc.router<AuthorizedContext>().mutation("update", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptItemsId>(flavored),
		update: z.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("name"),
				name: z.string().min(2).max(255),
			}),
			z.strictObject({ type: z.literal("price"), price: z.number().gt(0) }),
			z.strictObject({
				type: z.literal("quantity"),
				quantity: z.number().gt(0),
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
