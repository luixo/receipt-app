import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ receiptId: receiptIdSchema }))
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const accountUserResult = await database
			.selectFrom("receipts")
			.where("receipts.transferIntentionAccountId", "=", ctx.auth.accountId)
			.where("receipts.id", "=", input.receiptId)
			.innerJoin("users", (qb) =>
				qb.onRef(
					"users.ownerAccountId",
					"=",
					"receipts.transferIntentionAccountId",
				),
			)
			.select("users.id as userId")
			.executeTakeFirst();
		if (!accountUserResult) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Transfer intention for receipt "${input.receiptId}" does not exist or you are not its target.`,
			});
		}
		await database
			.updateTable("receipts")
			.where("receipts.id", "=", input.receiptId)
			.set({
				ownerAccountId: ctx.auth.accountId,
				transferIntentionAccountId: null,
			})
			.executeTakeFirst();
	});
