import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema } from "~web/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			sourceAccountId: accountIdSchema,
		}),
	)
	.mutation(async ({ ctx, input }) => {
		const { database } = ctx;
		const intention = await database
			.selectFrom("accountConnectionsIntentions")
			.select(["accountId", "targetAccountId"])
			.where((eb) =>
				eb.and({
					accountId: input.sourceAccountId,
					targetAccountId: ctx.auth.accountId,
				}),
			)
			.limit(1)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention from account id "${input.sourceAccountId}" not found.`,
			});
		}
		await database
			.deleteFrom("accountConnectionsIntentions")
			.where((eb) =>
				eb.and({
					accountId: intention.accountId,
					targetAccountId: intention.targetAccountId,
				}),
			)
			.execute();
	});
