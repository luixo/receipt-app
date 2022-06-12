import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptItemsId, ReceiptsId, UsersId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

type ReceiptItem = {
	id: ReceiptItemsId;
	name: string;
	price: number;
	quantity: number;
	locked: boolean;
	parts: { userId: UsersId; part: number }[];
};

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const rows = await database
			.selectFrom("receipt_items")
			.innerJoin("item_participants", (jb) =>
				jb.onRef("receipt_items.id", "=", "item_participants.itemId")
			)
			.select([
				"receipt_items.id as itemId",
				"receipt_items.name",
				"receipt_items.price",
				"receipt_items.locked",
				"receipt_items.quantity",
				"item_participants.userId",
				"item_participants.part",
			])
			.where("receipt_items.receiptId", "=", input.receiptId)
			.orderBy("receipt_items.id")
			.execute();

		return Object.values(
			rows.reduce<Record<string, ReceiptItem>>((acc, row) => {
				if (!acc[row.itemId]) {
					acc[row.itemId] = {
						id: row.itemId,
						name: row.name,
						price: Number(row.price),
						quantity: Number(row.quantity),
						locked: Boolean(row.locked),
						parts: [],
					};
				}
				acc[row.itemId]!.parts.push({
					userId: row.userId,
					part: Number(row.part),
				});
				return acc;
			}, {})
		);
	},
});
