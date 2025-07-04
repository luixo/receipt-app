import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { authProcedure } from "~web/handlers/trpc";
import { receiptIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.select("ownerAccountId")
			.where("id", "=", input.id)
			.limit(1)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `No receipt found by id "${input.id}".`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
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
