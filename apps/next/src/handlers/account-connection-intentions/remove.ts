import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { accountIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			targetAccountId: accountIdSchema,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const intention = await database
			.selectFrom("accountConnectionsIntentions")
			.select(["accountId", "targetAccountId"])
			.where("accountId", "=", ctx.auth.accountId)
			.where("targetAccountId", "=", input.targetAccountId)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for account id "${input.targetAccountId}" not found.`,
			});
		}
		await database
			.deleteFrom("accountConnectionsIntentions")
			.where("accountId", "=", intention.accountId)
			.where("targetAccountId", "=", intention.targetAccountId)
			.execute();
	});
