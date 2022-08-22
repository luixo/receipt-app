import * as trpc from "@trpc/server";
import { z } from "zod";

import { getDatabase } from "next-app/db";
import { AuthorizedContext } from "next-app/handlers/context";
import { debtIdSchema } from "next-app/handlers/validation";

export const router = trpc.router<AuthorizedContext>().query("get", {
	input: z.strictObject({
		id: debtIdSchema,
	}),
	resolve: async ({ input, ctx }) => {
		const database = getDatabase(ctx);
		const debt = await database
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
			])
			.executeTakeFirst();
		if (!debt) {
			throw new trpc.TRPCError({
				code: "NOT_FOUND",
				message: `Debt ${input.id} does not exist.`,
			});
		}

		return {
			...debt,
			amount: Number(debt.amount),
		};
	},
});
