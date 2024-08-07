import React from "react";

import { entries } from "remeda";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";

export const useAggregatedAllDebts = (
	data: TRPCQueryOutput<"debts.getByUsers">,
) => {
	const sums = React.useMemo(
		() =>
			entries(
				data
					.map(({ debts }) => debts)
					.reduce<Record<CurrencyCode, number>>(
						(acc, debts) =>
							debts.reduce((subacc, { currencyCode, sum }) => {
								if (!acc[currencyCode]) {
									acc[currencyCode] = 0;
								}
								acc[currencyCode] += sum;
								return subacc;
							}, acc),
						{},
					),
			).map(([currencyCode, sum]) => ({ currencyCode, sum })),
		[data],
	);
	const nonZeroSums = sums.filter(({ sum }) => sum !== 0);
	return [sums, nonZeroSums] as const;
};
