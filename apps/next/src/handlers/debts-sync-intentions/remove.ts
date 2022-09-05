import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import {
	getDebtIntention,
	statusSchema,
} from "next-app/handlers/debts-sync-intentions/utils";
import { debtIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().mutation("remove", {
	input: z.strictObject({
		id: debtIdSchema,
	}),
	resolve: async ({ input, ctx }): Promise<z.infer<typeof statusSchema>> => {
		const database = getDatabase(ctx);
		const debtIntention = await getDebtIntention(
			database,
			input.id,
			ctx.auth.accountId
		);
		if (!debtIntention) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Debt ${input.id} does not exist.`,
			});
		}
		if (!debtIntention.intentionAccountId) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention from ${ctx.auth.accountId} for debt ${input.id} does not exist.`,
			});
		}
		if (debtIntention.intentionAccountId !== ctx.auth.accountId) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Intention for debt ${input.id} is not from ${ctx.auth.accountId}.`,
			});
		}
		await database
			.deleteFrom("debtsSyncIntentions")
			.where("debtId", "=", input.id)
			.execute();
		if (debtIntention.theirOwnerAccountId) {
			return ["unsync", undefined];
		}
		return ["nosync", undefined];
	},
});
