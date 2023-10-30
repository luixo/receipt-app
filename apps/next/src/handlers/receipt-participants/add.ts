import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { addReceiptParticipants } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import {
	assignableRoleSchema,
	receiptIdSchema,
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
		const { database } = ctx;
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
		]);
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add participant${
					input.userIds.length === 1 ? "" : "s"
				} to receipt "${input.receiptId}".`,
			});
		}
		return addReceiptParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId,
			ctx.auth.email,
			input.userIds.map((userId) => [userId, input.role]),
		);
	});
