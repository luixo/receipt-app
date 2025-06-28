import React from "react";

import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { DebtsId } from "~db/models";

export const useDividers = (
	debts: TRPCQueryOutput<"debts.get">[],
	aggregatedDebts: { sum: number; currencyCode: CurrencyCode }[],
) => {
	const sums = React.useMemo<Partial<Record<CurrencyCode, number>>>(
		() =>
			aggregatedDebts.reduce(
				(acc, debt) => ({ ...acc, [debt.currencyCode]: -debt.sum }),
				{},
			),
		[aggregatedDebts],
	);
	return React.useMemo<
		{ debtId: DebtsId; currencyCode: CurrencyCode }[]
	>(() => {
		const sumsClone = { ...sums };
		const dividers: { debtId: DebtsId; currencyCode: CurrencyCode }[] = [];
		for (const debt of debts) {
			const currentAmount = sumsClone[debt.currencyCode] ?? 0;
			if (!currentAmount) {
				dividers.push({
					debtId: debt.id,
					currencyCode: debt.currencyCode,
				});
			}
			sumsClone[debt.currencyCode] = currentAmount + debt.amount;
		}
		return dividers;
	}, [debts, sums]);
};
