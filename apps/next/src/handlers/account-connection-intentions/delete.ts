import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "../../db";
import { AccountsId } from "../../db/models";
import { AuthorizedContext } from "../context";
import { flavored } from "../zod";

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
