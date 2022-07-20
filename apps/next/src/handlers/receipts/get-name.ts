import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { ReceiptsId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getReceiptById,
	getAccessRole,
} from "next-app/handlers/receipts/utils";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().query("get-name", {
	input: z.strictObject({
		id: z.string().uuid().refine<ReceiptsId>(flavored),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.id, [
			"id",
			"name",
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.id} does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId
		);
		if (!accessRole) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
			});
		}
		return receipt.name;
	},
});
