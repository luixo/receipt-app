import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { getSyncStatus } from "next-app/handlers/debts-sync-intentions/utils";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const selfDebt = await database
			.selectFrom("debts")
			.where("debts.id", "=", input.id)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				"debts.id",
				"debts.amount",
				"debts.currencyCode",
				"debts.note",
				"debts.timestamp",
				"debts.userId",
				"debts.lockedTimestamp",
				"debts.receiptId",
			])
			.executeTakeFirst();
		if (!selfDebt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist or you don't have access to it.`,
			});
		}

		const syncStatus = await getSyncStatus(
			database,
			selfDebt.id,
			ctx.auth.accountId,
		);
		const { amount, lockedTimestamp, ...debt } = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			locked: Boolean(lockedTimestamp),
			syncStatus,
		};
	});
