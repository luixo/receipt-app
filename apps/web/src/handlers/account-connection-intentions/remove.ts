import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "~web/handlers/trpc";
import { accountIdSchema } from "~web/handlers/validation";

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
			.where((eb) =>
				eb.and({
					accountId: ctx.auth.accountId,
					targetAccountId: input.targetAccountId,
				}),
			)
			.executeTakeFirst();
		if (!intention) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Intention for account id "${input.targetAccountId}" not found.`,
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
