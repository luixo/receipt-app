import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	getAccessRole,
	getReceiptById,
} from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.id, [
			"id",
			"name",
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.id} does not exist.`,
			});
		}
		const accessRole = await getAccessRole(
			database,
			receipt,
			ctx.auth.accountId,
		);
		if (!accessRole) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Account id ${ctx.auth.accountId} has no access to receipt ${receipt.id}`,
			});
		}
		return receipt.name;
	});
