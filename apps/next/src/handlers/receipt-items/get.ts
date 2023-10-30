import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getItemsWithParticipants } from "next-app/handlers/receipt-items/utils";
import { getAccessRole } from "next-app/handlers/receipts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
		}),
	)
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const receipt = await database
			.selectFrom("receipts")
			.where("receipts.id", "=", input.receiptId)
			.select(["receipts.ownerAccountId", "receipts.id"])
			.executeTakeFirst();
		if (!receipt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Receipt "${input.receiptId}" is not found.`,
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
				message: `Account "${ctx.auth.email}" has no access to receipt "${receipt.id}"`,
			});
		}
		const [items, participants] = await getItemsWithParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId,
		);

		return {
			role:
				participants.find(
					(participant) => participant.accountId === ctx.auth.accountId,
				)?.role ?? "owner",
			items,
			participants,
		};
	});
