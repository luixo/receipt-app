import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Debts, DebtsId } from "~db/models";
import type { MappedNullableObject } from "~utils/types";
import { queueCallFactory } from "~web/handlers/batch";
import type { AuthorizedContext } from "~web/handlers/context";
import { authProcedure } from "~web/handlers/trpc";
import { debtIdSchema } from "~web/handlers/validation";

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
			"debts.updatedAt",
			"debts.receiptId",
			"theirDebts.ownerAccountId as theirOwnerAccountId",
			"theirDebts.amount as theirAmount",
			"theirDebts.currencyCode as theirCurrencyCode",
			"theirDebts.timestamp as theirTimestamp",
			"theirDebts.updatedAt as theirUpdatedAt",
		])
		.$narrowType<
			MappedNullableObject<
				Debts,
				{
					theirOwnerAccountId: "ownerAccountId";
					theirAmount: "amount";
					theirCurrencyCode: "currencyCode";
					theirTimestamp: "timestamp";
					theirUpdatedAt: "updatedAt";
				}
			>
		>()
		.execute();

const mapDebt = (debt: Awaited<ReturnType<typeof fetchDebts>>[number]) => {
	const {
		amount,
		updatedAt,
		theirOwnerAccountId,
		theirUpdatedAt,
		theirAmount,
		theirCurrencyCode,
		theirTimestamp,
		receiptId,
		...debtRest
	} = debt;

	return {
		...debtRest,
		amount: Number(amount),
		updatedAt,
		receiptId: receiptId || undefined,
		their: theirOwnerAccountId
			? {
					updatedAt: theirUpdatedAt,
					amount: -Number(theirAmount),
					currencyCode: theirCurrencyCode,
					timestamp: theirTimestamp,
			  }
			: undefined,
	};
};

const queueDebt = queueCallFactory<
	AuthorizedContext,
	{ id: DebtsId },
	ReturnType<typeof mapDebt>
>((ctx) => async (inputs) => {
	const debts = await fetchDebts(
		ctx,
		inputs.map(({ id }) => id),
	);
	return inputs.map((input) => {
		const debt = debts.find(({ id }) => id === input.id);
		if (!debt) {
			return new TRPCError({
				code: "NOT_FOUND",
				message: `Debt "${input.id}" does not exist or you don't have access to it.`,
			});
		}
		return mapDebt(debt);
	});
});

export const procedure = authProcedure
	.input(z.strictObject({ id: debtIdSchema }))
	.query(queueDebt);
