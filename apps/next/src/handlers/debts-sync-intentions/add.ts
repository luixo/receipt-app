import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getDebtIntention } from "next-app/handlers/debts-sync-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(
		z.strictObject({
			id: debtIdSchema,
		}),
	)
	.mutation(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debtIntention = await getDebtIntention(
			database,
			input.id,
			ctx.auth.accountId,
		);
		if (!debtIntention) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist.`,
			});
		}
		if (!debtIntention.mineLockedTimestamp) {
			throw new trpc.TRPCError({
				code: "PRECONDITION_FAILED",
				message: `Debt ${input.id} is not locked to sync.`,
			});
		}
		if (debtIntention.intentionAccountId) {
			if (debtIntention.intentionAccountId === ctx.auth.accountId) {
				throw new trpc.TRPCError({
					code: "CONFLICT",
					message: `Debt ${input.id} already has intention to sync from you.`,
				});
			}
			throw new trpc.TRPCError({
				code: "CONFLICT",
				message: `Debt ${input.id} already has intention to sync from the counterparty. Accept or reject it first.`,
			});
		}
		if (
			debtIntention.mineLockedTimestamp.valueOf() ===
			debtIntention.theirLockedTimestamp?.valueOf()
		) {
			throw new trpc.TRPCError({
				code: "BAD_REQUEST",
				message: `Debt ${input.id} is in sync`,
			});
		}
		// Three possible situations when we narrow down here:
		// 1. Counterparty doesn't have this debt at all
		// 2. Counterparty's debt is not locked
		// 3. Counterparty's debt is locked with a different timestamp
		const lockedTimestamp = new Date();
		await database
			.insertInto("debtsSyncIntentions")
			.values({
				debtId: input.id,
				ownerAccountId: ctx.auth.accountId,
				lockedTimestamp,
			})
			.execute();
		return lockedTimestamp;
	});
