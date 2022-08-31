import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

import { createController } from "./controller";
import { Debt } from "./types";

export const add = (trpc: TRPCReactContext, debt: Debt) =>
	createController(trpc, debt.id).set(debt);
export const remove = (trpc: TRPCReactContext, debtId: DebtsId) =>
	createController(trpc, debtId).invalidate();

export const update = (
	trpc: TRPCReactContext,
	debtId: DebtsId,
	updater: (debt: Debt) => Debt
) => {
	const modifiedDebtRef = createRef<Debt | undefined>();
	createController(trpc, debtId).update((debt) => {
		modifiedDebtRef.current = debt;
		return updater(debt);
	});
	return modifiedDebtRef.current;
};
