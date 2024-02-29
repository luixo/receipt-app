import { z } from "zod";

import { receiptNameSchema } from "~app/utils/validation";
import type { ReceiptsId } from "~db";
import { addReceiptParticipants } from "~web/handlers/receipt-participants/utils";
import { authProcedure } from "~web/handlers/trpc";
import { currencyCodeSchema, userIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			name: receiptNameSchema,
			currencyCode: currencyCodeSchema,
			participants: z.array(userIdSchema).optional(),
			issued: z.date(),
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const id: ReceiptsId = ctx.getUuid();
		const { database } = ctx;
		await database.transaction().execute(async (tx) => {
			await tx
				.insertInto("receipts")
				.values({
					id,
					name: input.name,
					currencyCode: input.currencyCode,
					created: new Date(),
					issued: input.issued,
					ownerAccountId: ctx.auth.accountId,
				})
				.executeTakeFirst();
			if (!input.participants) {
				return;
			}
			await addReceiptParticipants(
				tx,
				id,
				ctx.auth.accountId,
				ctx.auth.email,
				input.participants.map((participantUserId) => [
					participantUserId,
					"editor",
				]),
			);
		});
		return id;
	});
