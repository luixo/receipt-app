import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { ReceiptsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

import { getReceiptById } from "./utils";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.id, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.id}`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${input.id} is not owned by ${ctx.auth.accountId}`,
			});
		}
		await database
			.deleteFrom("receipts")
			.where("id", "=", input.id)
			.executeTakeFirst();
	},
});
