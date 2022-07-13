import * as trpc from "@trpc/server";
import { v4 } from "uuid";
import { z } from "zod";

import { VALIDATIONS_CONSTANTS } from "app/utils/validation";

import { getDatabase } from "../../db";
import { ReceiptsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { getAccessRole, getReceiptById } from "../receipts/utils";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().mutation("put", {
	input: z.strictObject({
		receiptId: z.string().uuid().refine<ReceiptsId>(flavored),
		name: z
			.string()
			.min(VALIDATIONS_CONSTANTS.receiptItemName.min)
			.max(VALIDATIONS_CONSTANTS.receiptItemName.max),
		price: z.number().gt(0),
		quantity: z.number().gt(0),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
			"id",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.receiptId}`,
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
		const id = v4();
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
	},
});
