import React from "react";

import { entries, isNonNullish } from "remeda";

import {
	type TRPCQueryErrorResult,
	type TRPCQuerySuccessResult,
	trpc,
} from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { round } from "~utils/math";

export const useAggregatedDebts = (
	idsQuery: TRPCQuerySuccessResult<"debts.getIdsByUser">,
) => {
	const debtIds = idsQuery.data;
	const debtQueries = trpc.useQueries((t) =>
		debtIds.map((debt) => t.debts.get({ id: debt.id })),
	);
	const debtsData = debtQueries.map((query) => query.data).filter(isNonNullish);
	const debtsLoading = debtQueries.map((query) => query.isLoading);
	const debtsErrorQueries = debtQueries.filter((query) => query.error !== null);
	const aggregatedDebts = React.useMemo(() => {
		if (debtsData.length !== debtQueries.length) {
			return [];
		}
		return entries(
			debtsData.reduce<Record<CurrencyCode, number>>((acc, debt) => {
				const byCurrencyCode = (acc[debt.currencyCode] || 0) + debt.amount;
				acc[debt.currencyCode] = byCurrencyCode;
				return acc;
			}, {}),
		).map(([currencyCode, sum]) => ({ currencyCode, sum: round(sum) }));
	}, [debtQueries.length, debtsData]);
	return [
		aggregatedDebts,
		aggregatedDebts.filter((debt) => debt.sum !== 0),
		debtsLoading.some(Boolean),
		// TODO: this breaks if `as` removed, why?
		debtsErrorQueries as TRPCQueryErrorResult<"debts.get">[],
	] as const;
};
