import * as trpc from "@trpc/server";
import { sql } from "kysely";
import { z } from "zod";
import { getDatabase } from "../../db";

import { ReceiptsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await database
			.selectFrom("receipts")
			.innerJoin("receipt_items", (jb) =>
				jb.onRef("receipt_items.receiptId", "=", "receipts.id")
			)
			.select([
				"receipts.id",
				"receipts.name",
				"currency",
				sql<string>`sum(receipt_items.price * receipt_items.quantity)`.as(
					"sum"
				),
				"ownerAccountId",
			])
			.where("receipts.id", "=", input.id)
			.groupBy("receipts.id")
			.executeTakeFirst();
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `No receipt ${input.id} found`,
			});
		}
		return receipt;
	},
});
