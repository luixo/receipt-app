import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptItemsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getReceiptById, getAccessRole } from "../receipts/utils";
import { flavored } from "../zod";

import { getReceiptItemById } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptItemsId>(flavored),
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
		await database
			.deleteFrom("receiptItems")
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
