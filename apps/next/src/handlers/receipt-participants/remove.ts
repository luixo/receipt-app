import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getReceiptParticipant } from "next-app/handlers/receipt-participants/utils";
import { getReceiptById } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
import { receiptIdSchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
			userId: userIdSchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const receipt = await getReceiptById(database, input.receiptId, [
			"ownerAccountId",
			"lockedTimestamp",
		]);
		if (!receipt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Receipt ${input.receiptId} does not exist.`,
			});
		}
		if (receipt.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to remove participants from receipt ${input.receiptId}.`,
			});
		}
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Not enough rights to remove a user ${input.userId} from receipt ${input.receiptId}.`,
			});
		}
		const receiptParticipant = await getReceiptParticipant(
			database,
			input.userId,
			input.receiptId,
			["userId"]
		);
		if (!receiptParticipant) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `User ${input.userId} does not participate in receipt ${input.receiptId}.`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new trpc.TRPCError({
				code: "FORBIDDEN",
				message: `Receipt ${input.receiptId} cannot be updated while locked.`,
			});
		}

		await database.transaction().execute(async (tx) => {
			await tx
				.deleteFrom("itemParticipants")
				.where("userId", "=", input.userId)
				.where("itemId", "in", (eb) =>
					eb
						.selectFrom("receiptItems")
						.where("receiptId", "=", input.receiptId)
						.select("id")
				)
				.executeTakeFirst();
			await tx
				.deleteFrom("receiptParticipants")
				.where("userId", "=", input.userId)
				.where("receiptId", "=", input.receiptId)
				.executeTakeFirst();
		});
	});
