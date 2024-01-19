import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getReceiptParticipant } from "next-app/handlers/receipt-participants/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { getUserById } from "next-app/handlers/users/utils";
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
		const receipt = await database
			.selectFrom("receipts")
			.select(["ownerAccountId", "lockedTimestamp"])
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
				message: `Not enough rights to remove participant from receipt "${input.receiptId}".`,
			});
		}
		const user = await getUserById(database, input.userId, ["ownerAccountId"]);
		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `User "${input.userId}" does not exist.`,
			});
		}
		if (user.ownerAccountId !== ctx.auth.accountId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `User "${input.userId}" is not owned by "${ctx.auth.email}".`,
			});
		}
		const receiptParticipant = await getReceiptParticipant(
			database,
			input.userId,
			input.receiptId,
			["userId"],
		);
		if (!receiptParticipant) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `User "${input.userId}" does not participate in receipt "${input.receiptId}".`,
			});
		}
		if (receipt.lockedTimestamp) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Receipt "${input.receiptId}" cannot be updated while locked.`,
			});
		}

		await database.transaction().execute(async (tx) => {
			await tx
				.deleteFrom("itemParticipants")
				.where((eb) =>
					eb("userId", "=", input.userId).and("itemId", "in", (ebb) =>
						ebb
							.selectFrom("receiptItems")
							.where("receiptId", "=", input.receiptId)
							.select("id"),
					),
				)

				.executeTakeFirst();
			await tx
				.deleteFrom("receiptParticipants")
				.where((eb) =>
					eb.and({
						receiptId: input.receiptId,
						userId: input.userId,
					}),
				)
				.executeTakeFirst();
		});
	});
