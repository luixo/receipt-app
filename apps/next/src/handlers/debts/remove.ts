import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getDebtIntention } from "next-app/handlers/debts-sync-intentions/utils";
import { getDebt } from "next-app/handlers/debts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
		})
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debt = await getDebt(database, input.id, ctx.auth.accountId, []);
		if (!debt) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `No debt found by id ${input.id} on account ${ctx.auth.accountId}`,
			});
		}
		await database
			.deleteFrom("debts")
			.where("id", "=", input.id)
			.where("ownerAccountId", "=", ctx.auth.accountId)
			.executeTakeFirst();
		const syncIntention = await getDebtIntention(
			database,
			input.id,
			ctx.auth.accountId
		);
		if (syncIntention) {
			await database
				.deleteFrom("debtsSyncIntentions")
				.where("debtId", "=", input.id)
				.where("ownerAccountId", "=", ctx.auth.accountId)
				.execute();
		}
	});
