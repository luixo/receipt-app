import * as trpc from "@trpc/server";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";

export const router = trpc
	.router<AuthorizedContext>()
	.query("get-non-resolved-amount", {
		resolve: async ({ ctx }) => {
			const database = getDatabase(ctx);

			const receiptIds = await database
				.selectFrom("receiptParticipants")
				.innerJoin("users", (qb) =>
					qb
						.on("users.connectedAccountId", "=", ctx.auth.accountId)
						.onRef("users.id", "=", "receiptParticipants.userId")
				)
				.where("receiptParticipants.resolved", "=", false)
				.select("receiptId")
				.execute();
			return receiptIds.length;
		},
	});
