import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { addReceiptParticipants } from "next-app/handlers/receipt-participants/utils";
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
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerAccountId", "transferIntentionAccountId"])
			.where("id", "=", input.receiptId)
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to add ${
					input.userIds.length === 1 ? "participant" : "participants"
				} to receipt "${input.receiptId}".`,
			});
		}
		if (receipt.transferIntentionAccountId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: `Cannot add participants to receipt "${input.receiptId}" as it has transfer intention.`,
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
