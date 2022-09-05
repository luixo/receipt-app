import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

import { createBroadController } from "./controller";
import { Debt } from "./types";

export const add = (trpc: TRPCReactContext, debt: Debt) => {
	if (!debt.receiptId) {
		return;
	}
	createBroadController(trpc).set([
		[["debts.getByReceiptId", { receiptId: debt.receiptId }], debt],
	]);
};
export const remove = (trpc: TRPCReactContext) =>
	createBroadController(trpc).invalidate();

export const update = (
	trpc: TRPCReactContext,
	debtId: DebtsId,
	updater: (debt: Debt) => Debt | undefined
) => {
	const modifiedDebtRef = createRef<Debt | undefined>();
	createBroadController(trpc).update(([, debt]) => {
		if (!debt || debt.id !== debtId) {
			return debt;
		}
		const maybeUpdatedDebt = updater(debt);
		if (!maybeUpdatedDebt) {
			return debt;
		}
		modifiedDebtRef.current = debt;
		return maybeUpdatedDebt;
	});
	return modifiedDebtRef.current;
};
