import React from "react";

import { TRPCQuerySuccessResult } from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";

export const useAggregatedDebts = (
	query: TRPCQuerySuccessResult<"debts.getUser">
) => {
	const debts = query.data;
	const aggregatedDebts = React.useMemo(
		() =>
			Object.entries(
				debts.reduce<Record<CurrencyCode, number>>((acc, debt) => {
					if (!acc[debt.currencyCode]) {
						acc[debt.currencyCode] = 0;
					}
					acc[debt.currencyCode] += debt.amount;
					return acc;
				}, {})
			).map(([currencyCode, sum]) => ({
				currencyCode: currencyCode as CurrencyCode,
				sum: round(sum),
			})),
		[debts]
	);
	return [
		aggregatedDebts,
		aggregatedDebts.filter((debt) => debt.sum !== 0),
	] as const;
};
