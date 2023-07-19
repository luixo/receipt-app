import React from "react";

import { useRouter } from "app/hooks/use-router";
import { TRPCQuerySuccessResult } from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { round } from "app/utils/math";

export const useAggregatedDebts = (
	query: TRPCQuerySuccessResult<"debts.getUser">
) => {
	const debts = query.data;
	const router = useRouter();
	React.useEffect(() => {
		if (debts.length === 0) {
			router.replace("/debts");
		}
	}, [debts, router]);
	return React.useMemo(
		() =>
			Object.entries(
				debts.reduce<Record<CurrencyCode, number>>((acc, debt) => {
					if (!acc[debt.currencyCode]) {
						acc[debt.currencyCode] = 0;
					}
					acc[debt.currencyCode] += debt.amount;
					return acc;
				}, {})
			).map(([currencyCode, sum]) => ({ currencyCode, sum: round(sum) })),
		[debts]
	);
};
