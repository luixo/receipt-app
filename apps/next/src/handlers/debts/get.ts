import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(async ({ input, ctx }) => {
		const { database } = ctx;
		const selfDebt = await database
			.selectFrom("debts")
			.where("debts.id", "=", input.id)
			.where("debts.ownerAccountId", "=", ctx.auth.accountId)
			.leftJoin("debts as theirDebts", (qb) =>
				qb
					.onRef("theirDebts.id", "=", "debts.id")
					.onRef("theirDebts.ownerAccountId", "<>", "debts.ownerAccountId"),
			)
			.select([
				"debts.id",
				"debts.amount",
				"debts.currencyCode",
				"debts.note",
				"debts.timestamp",
				"debts.userId",
				"debts.lockedTimestamp",
				"debts.receiptId",
				"theirDebts.ownerAccountId as theirOwnerAccountId",
				"theirDebts.amount as theirAmount",
				"theirDebts.currencyCode as theirCurrencyCode",
				"theirDebts.timestamp as theirTimestamp",
				"theirDebts.lockedTimestamp as theirLockedTimestamp",
			])
			.executeTakeFirst();
		if (!selfDebt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${input.id}" does not exist or you don't have access to it.`,
			});
		}

		const {
			amount,
			lockedTimestamp,
			theirOwnerAccountId,
			theirLockedTimestamp,
			theirAmount,
			theirCurrencyCode,
			theirTimestamp,
			...debt
		} = selfDebt;

		return {
			...debt,
			amount: Number(amount),
			lockedTimestamp: lockedTimestamp || undefined,
			their: theirOwnerAccountId
				? {
						lockedTimestamp: theirLockedTimestamp || undefined,
						amount: -Number(theirAmount!),
						currencyCode: theirCurrencyCode!,
						timestamp: theirTimestamp!,
				  }
				: undefined,
		};
	});
