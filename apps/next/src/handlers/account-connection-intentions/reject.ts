import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { accountIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("reject", {
	input: z.strictObject({
		sourceAccountId: accountIdSchema,
	}),
	resolve: async ({ ctx, input }) => {
		const database = getDatabase(ctx);
		const intention = database
			.selectFrom("accountConnectionsIntentions")
			.where("accountId", "=", input.sourceAccountId)
			.where("targetAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		if (!intention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention from ${input.sourceAccountId} to ${ctx.auth.accountId} does not exist.`,
			});
		}
		await database
			.deleteFrom("accountConnectionsIntentions")
			.where("accountId", "=", input.sourceAccountId)
			.where("targetAccountId", "=", ctx.auth.accountId)
			.execute();
	},
});
