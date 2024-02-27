import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ receiptId: receiptIdSchema }))
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receiptTransfer = await database
			.selectFrom("receipts")
			.where("receipts.id", "=", input.receiptId)
			.innerJoin("users", (qb) =>
				qb.onRef(
					"users.ownerAccountId",
					"=",
					"receipts.transferIntentionAccountId",
				),
			)
			.select([
				"receipts.transferIntentionAccountId",
				"receipts.ownerAccountId",
			])
			.executeTakeFirst();
		if (!receiptTransfer) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		if (
			receiptTransfer.transferIntentionAccountId !== ctx.auth.accountId &&
			receiptTransfer.ownerAccountId !== ctx.auth.accountId
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `You are not neither target nor owner of transfer intention for receipt "${input.receiptId}".`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("receipts")
				.where("receipts.id", "=", input.receiptId)
				.set({ transferIntentionAccountId: null })
				.executeTakeFirst();
		});
	});
