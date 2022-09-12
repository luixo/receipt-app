import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getItemsWithParticipants } from "next-app/handlers/receipt-items/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { receiptIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			receiptId: receiptIdSchema,
		})
	)
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const [items, participants] = await getItemsWithParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId
		);

		return {
			role:
				participants.find(
					(participant) => participant.accountId === ctx.auth.accountId
				)?.role ?? "owner",
			items,
			participants,
		};
	});
