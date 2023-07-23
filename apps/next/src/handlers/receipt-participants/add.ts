import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { addReceiptParticipants } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	receiptIdSchema,
	assignableRoleSchema,
	userIdSchema,
} from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			userIds: z.array(userIdSchema).nonempty(),
			role: assignableRoleSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add participants to receipt ${input.receiptId}.`,
			});
		}
		return addReceiptParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId,
			input.userIds.map((userId) => [userId, input.role]),
		);
	});
