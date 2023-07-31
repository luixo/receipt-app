import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import {
	getDebtsResult,
	upsertDebtFromReceipt,
} from "next-app/handlers/debts/utils";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			lockedTimestamp: z.date(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"id",
			"ownerAccountId",
			"lockedTimestamp",
			"name",
			"issued",
			"currencyCode",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id ${input.receiptId}`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt ${input.receiptId} is not owned by ${ctx.auth.accountId}`,
			});
		}
		const lockedTimestamp = { receipt };
		if (!lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.receiptId} should be locked in order to propagate debts`,
			});
		}
		const validParticipants = await getValidParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId,
		);
		const createdTimestamp = new Date();
		const actualDebts = await upsertDebtFromReceipt(
			database,
			validParticipants,
			receipt,
			createdTimestamp,
		);
		return getDebtsResult(
			validParticipants,
			actualDebts,
			receipt,
			createdTimestamp,
		);
	});
