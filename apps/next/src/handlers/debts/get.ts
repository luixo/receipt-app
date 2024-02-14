import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DebtsId } from "next-app/db/models";
import { queueCallFactory } from "next-app/handlers/batch";
import type { AuthorizedContext } from "next-app/handlers/context";
import { authProcedure } from "next-app/handlers/trpc";
import { debtIdSchema } from "next-app/handlers/validation";

const fetchDebts = async (
	{ database, auth }: AuthorizedContext,
	ids: DebtsId[],
) =>
	database
		.selectFrom("debts")
		.where((eb) =>
			eb.and([
				eb("debts.id", "in", ids),
				eb("debts.ownerAccountId", "=", auth.accountId),
			]),
		)
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
		.execute();

const mapDebt = (debt: Awaited<ReturnType<typeof fetchDebts>>[number]) => {
	const {
		amount,
		lockedTimestamp,
		theirOwnerAccountId,
		theirLockedTimestamp,
		theirAmount,
		theirCurrencyCode,
		theirTimestamp,
		...debtRest
	} = debt;

	return {
		...debtRest,
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
};

const queueDebt = queueCallFactory<
	AuthorizedContext,
	{ id: DebtsId },
	ReturnType<typeof mapDebt>,
	Awaited<ReturnType<typeof fetchDebts>>
>(
	async (ctx, inputs) =>
		fetchDebts(
			ctx,
			inputs.map(({ id }) => id),
		),
	async (_ctx, input, debts) => {
		const debt = debts.find(({ id }) => id === input.id);
		if (!debt) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${input.id}" does not exist or you don't have access to it.`,
			});
		}
		return mapDebt(debt);
	},
);

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(queueDebt);
