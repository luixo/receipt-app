import { z } from "zod";

import { receiptNameSchema } from "app/utils/validation";
import type { ReceiptsId } from "next-app/db/models";
import { addReceiptParticipants } from "next-app/handlers/receipt-participants/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { currencyCodeSchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			name: receiptNameSchema,
			currencyCode: currencyCodeSchema,
			userIds: z.array(userIdSchema).optional(),
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
			if (input.userIds) {
				await addReceiptParticipants(
					tx,
					id,
					ctx.auth.accountId,
					input.userIds.map((userId) => [userId, "editor"]),
				);
			}
		});
		return id;
	});
