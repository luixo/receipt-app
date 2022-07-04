import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AccountsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

export const router = trpc.router<AuthorizedContext>().mutation("reject", {
	input: z.strictObject({
		sourceAccountId: z.string().uuid().refine<AccountsId>(flavored),
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
