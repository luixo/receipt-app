import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { getLockedStatus } from "next-app/handlers/debts-sync-intentions/utils";
import { debtIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		id: debtIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const selfDebt = await database
			.selectFrom("debts")
			.where("debts.id", "=", input.id)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.select([
				"debts.id",
				"debts.amount",
				"debts.currency",
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

		const [status, intentionDirection] = await getLockedStatus(
			database,
			selfDebt.id,
			ctx.auth.accountId
		);
		const { amount, lockedTimestamp, ...debt } = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			locked: Boolean(lockedTimestamp),
			status,
			intentionDirection,
		};
	},
});
