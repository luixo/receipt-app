import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getDebt } from "next-app/handlers/debts/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const selfDebt = await getDebt(database, input.id, ctx.auth.accountId, [
			"debts.id",
			"debts.amount",
			"debts.currencyCode",
			"debts.note",
			"debts.timestamp",
			"debts.userId",
			"debts.lockedTimestamp",
			"debts.receiptId",
		]);
		if (!selfDebt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist or you don't have access to it.`,
			});
		}

		const {
			amount,
			lockedTimestamp,
			theirOwnerAccountId,
			theirLockedTimestamp,
			...debt
		} = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			lockedTimestamp: lockedTimestamp || undefined,
			their: theirOwnerAccountId
				? {
						lockedTimestamp: theirLockedTimestamp || undefined,
				  }
				: undefined,
		};
	});
