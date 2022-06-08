import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().query("items", {
	input: z.object({
		id: z.string(),
		offset: z.number(),
		limit: z.number(),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receiptItems = await database
			.selectFrom("receipts")
			.innerJoin("receipt_items", (jb) =>
				jb.onRef("receipts.id", "=", "receipt_items.receiptId")
			)
			.select([
				"receipt_items.id",
				"receipt_items.name",
				"receipt_items.price",
				"receipt_items.locked",
				"receipt_items.quantity",
			])
			.where("receipts.id", "=", input.id)
			.orderBy("receipt_items.id")
			.offset(input.offset)
			.limit(input.limit)
			.execute();

		return receiptItems;
	},
});
