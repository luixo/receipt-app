import * as trpc from "@trpc/server";
import { z } from "zod";

import {
	getDebtsResult,
	upsertDebtFromReceipt,
} from "next-app/handlers/debts/utils";
import { getValidParticipants } from "next-app/handlers/receipt-items/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			userId: userIdSchema,
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
		const { lockedTimestamp } = receipt;
		if (!lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.receiptId} should be locked in order to update debt`,
			});
		}
		const validParticipants = await getValidParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId,
		);
		const matchedParticipant = validParticipants.find(
			(participant) => participant.remoteUserId === input.userId,
		);
		if (!matchedParticipant) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `${input.userId} is not a valid participant of receipt ${input.receiptId}`,
			});
		}
		const createdTimestamp = new Date();
		const actualDebts = await upsertDebtFromReceipt(
			database,
			[matchedParticipant],
			receipt,
			createdTimestamp,
		);
		const updatedDebts = getDebtsResult(
			[matchedParticipant],
			actualDebts,
			receipt,
			createdTimestamp,
		);
		return updatedDebts[0]!;
	});
