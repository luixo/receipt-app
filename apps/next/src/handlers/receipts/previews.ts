import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AuthorizedContext } from "../context";

export const router = trpc.router<AuthorizedContext>().query("previews", {
	input: z.strictObject({
		offset: z.number(),
		limit: z.number(),
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipts = await database
			.selectFrom("accounts")
			.innerJoin("users", (jb) =>
				jb.onRef("users.connectedAccountId", "=", "accounts.id")
			)
			.innerJoin("receipt_participants", (jb) =>
				jb.onRef("receipt_participants.userId", "=", "users.id")
			)
			.innerJoin("receipts", (jb) =>
				jb.onRef("receipts.id", "=", "receipt_participants.receiptId")
			)
			.where("accounts.id", "=", ctx.auth.accountId)
			.where("receipts.ownerAccountId", "<>", ctx.auth.accountId)
			.select([
				"receipt_participants.role",
				"receipts.id",
				"receipts.name",
				"receipts.created",
				"receipts.issued",
				"receipts.currency",
				"receipts.ownerAccountId",
				"receipts.resolved",
			])
			.offset(input.offset)
			.limit(input.limit)
			.execute();

		return receipts;
	},
});
