import { v4 } from "uuid";
import { z } from "zod";

import { receiptNameSchema } from "app/utils/validation";
import { getDatabase } from "next-app/db";
import { addReceiptParticipants } from "next-app/handlers/receipt-participants/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { currencySchema, userIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			name: receiptNameSchema,
			currency: currencySchema,
			userIds: z.array(userIdSchema).optional(),
			issued: z.date(),
		})
	)
	.mutation(async ({ input, ctx }) => {
		const id = v4();
		const database = getDatabase(ctx);
		await database.transaction().execute(async (tx) => {
			await tx
				.insertInto("receipts")
				.values({
					id,
					name: input.name,
					currency: input.currency,
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
					input.userIds.map((userId) => [userId, "editor"])
				);
			}
		});
		return id;
	});
