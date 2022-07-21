import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { accountIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("delete", {
	input: z.strictObject({
		targetAccountId: accountIdSchema,
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
