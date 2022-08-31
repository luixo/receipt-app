import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { Currency } from "app/utils/currency";
import { UsersId } from "next-app/src/db/models";

import { createController } from "./controller";
import { updateUserDebts } from "./utils";

export const update = (
	trpc: TRPCReactContext,
	userId: UsersId,
	currency: Currency,
	updater: (sum: number) => number
) => {
	const modifiedSumRef = createRef<number | undefined>();
	updateUserDebts(trpc, userId, (debts) => {
		const matchedCurrencyIndex = debts.findIndex(
			(debt) => debt.currency === currency
		);
		const matchedDebts =
			matchedCurrencyIndex === -1
				? { currency, sum: 0 }
				: debts[matchedCurrencyIndex]!;
		modifiedSumRef.current = matchedDebts.sum;
		const updatedSum = updater(matchedDebts.sum);
		if (updatedSum === 0) {
			if (matchedCurrencyIndex === -1) {
				return debts;
			}
			return [
				...debts.slice(0, matchedCurrencyIndex),
				...debts.slice(matchedCurrencyIndex + 1),
			];
		}
		return [
			...debts.slice(0, matchedCurrencyIndex),
			{ ...matchedDebts, sum: updatedSum },
			...debts.slice(matchedCurrencyIndex + 1),
		];
	});
	return modifiedSumRef.current;
};

export const invalidate = (trpc: TRPCReactContext) =>
	createController(trpc).invalidate();
