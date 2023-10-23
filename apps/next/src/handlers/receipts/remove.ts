import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.id, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id "${input.id}".`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt "${input.id}" is not owned by "${ctx.auth.email}".`,
			});
		}
		await database.transaction().execute(async (tx) => {
			await tx
				.updateTable("debts")
				.where("receiptId", "=", input.id)
				.set({ receiptId: null })
				.execute();
			await tx
				.deleteFrom("receipts")
				.where("id", "=", input.id)
				.executeTakeFirst();
		});
	});
