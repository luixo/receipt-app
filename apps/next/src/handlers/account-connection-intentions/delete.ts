import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AccountsId } from "next-app/db/models";
import { AuthorizedContext } from "next-app/handlers/context";
import { flavored } from "next-app/handlers/zod";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		targetAccountId: z.string().uuid().refine<AccountsId>(flavored),
	}),
	resolve: async ({ ctx, input }) => {
		const database = getDatabase(ctx);
		const intention = database
			.selectFrom("accountConnectionsIntentions")
			.where("accountId", "=", ctx.auth.accountId)
			.where("targetAccountId", "=", input.targetAccountId)
			.executeTakeFirst();
		if (!intention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention from ${ctx.auth.accountId} to ${input.targetAccountId} does not exist.`,
			});
		}
		await database
			.deleteFrom("accountConnectionsIntentions")
			.where("accountId", "=", ctx.auth.accountId)
			.where("targetAccountId", "=", input.targetAccountId)
			.execute();
	},
});
