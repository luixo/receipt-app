import React from "react";

import { isNonNull } from "remeda";

import type { useDividers } from "~app/hooks/use-dividers";
import { useShowResolvedDebts } from "~app/hooks/use-show-resolved-debts";
import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { DebtsId } from "~db/models";

export const useDebtsWithDividers = (
	debtIds: DebtsId[],
	successDebts: TRPCQueryOutput<"debts.get">[],
	dividers: ReturnType<typeof useDividers>,
) => {
	const [showResolvedDebts] = useShowResolvedDebts();
	return React.useMemo<
		{ id: DebtsId; dividerCurrencyCode?: CurrencyCode }[]
	>(() => {
		if (successDebts.length === 0) {
			return debtIds.map((id) => ({ id }));
		}
		const evenCurrencyCodes = new Set<CurrencyCode>();
		return successDebts
			.map((debt) => {
				const divider = dividers.find(
					({ debtId: dividerDebtId }) => dividerDebtId === debt.id,
				);
				if (!showResolvedDebts && evenCurrencyCodes.has(debt.currencyCode)) {
					return null;
				}
				if (!divider) {
					return { id: debt.id };
				}
				evenCurrencyCodes.add(divider.currencyCode);
				if (!showResolvedDebts) {
					return null;
				}
				return { id: debt.id, dividerCurrencyCode: divider.currencyCode };
			})
			.filter(isNonNull);
	}, [successDebts, debtIds, dividers, showResolvedDebts]);
};
