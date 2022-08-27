import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getDebtIntention } from "next-app/handlers/debts-sync-intentions/utils";
import { debtIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("reject", {
	input: z.strictObject({
		id: debtIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debtIntention = await getDebtIntention(
			database,
			input.id,
			ctx.auth.accountId
		);
		if (!debtIntention) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Debt ${input.id} is not found.`,
			});
		}
		if (!debtIntention.intentionAccountId) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Intention for debt ${input.id} is not found.`,
			});
		}
		if (debtIntention.intentionAccountId === ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt ${input.id} is yours, please remove it instead of rejecting.`,
			});
		}
		await database
			.deleteFrom("debtsSyncIntentions")
			.where("debtId", "=", input.id)
			.execute();
	},
});
