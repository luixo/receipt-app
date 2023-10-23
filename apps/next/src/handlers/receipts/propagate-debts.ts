import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.receiptId, [
			"id",
			"ownerAccountId",
			"lockedTimestamp",
			"name",
			"issued",
			"currencyCode",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No receipt found by id "${input.receiptId}".`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: `Receipt "${input.receiptId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const lockedTimestamp = { receipt };
		if (!lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${input.receiptId}" should be locked in order to propagate debts.`,
			});
		}
		const validParticipants = await getValidParticipants(
			ctx,
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
