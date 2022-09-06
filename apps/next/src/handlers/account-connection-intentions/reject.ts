import { z } from "zod";

import { getDatabase } from "next-app/db";
import { removeIntention } from "next-app/handlers/account-connection-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { accountIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			sourceAccountId: accountIdSchema,
		})
	)
	.mutation(async ({ ctx, input }) => {
		const database = getDatabase(ctx);
		const intention = await database
			.selectFrom("accountConnectionsIntentions")
			.select(["accountId", "targetAccountId"])
			.where("accountId", "=", input.sourceAccountId)
			.where("targetAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		return removeIntention(
			database,
			intention,
			`from account id ${input.sourceAccountId}`
		);
	});
