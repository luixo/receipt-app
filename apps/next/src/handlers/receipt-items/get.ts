import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getItemsWithParticipants } from "next-app/handlers/receipt-items/utils";
import { receiptIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		receiptId: receiptIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const [items, participants] = await getItemsWithParticipants(
			database,
			input.receiptId,
			ctx.auth.accountId
		);

		return {
			role:
				participants.find(
					(participant) => participant.connectedAccountId === ctx.auth.accountId
				)?.role ?? "owner",
			items,
			participants,
		};
	},
});
