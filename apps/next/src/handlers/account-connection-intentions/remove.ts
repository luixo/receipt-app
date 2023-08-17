import { z } from "zod";

import { removeIntention } from "next-app/handlers/account-connection-intentions/utils";
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
		return removeIntention(
			database,
			intention,
			`for account id ${input.targetAccountId}`,
		);
	});
