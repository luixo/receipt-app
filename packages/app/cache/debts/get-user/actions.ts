import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId, UsersId } from "next-app/src/db/models";

import { createController } from "./controller";
import { Debt } from "./types";

const sortByTimestamp = (a: Debt, b: Debt) =>
	b.timestamp.valueOf() - a.timestamp.valueOf();

export const update = (
	trpc: TRPCReactContext,
	userId: UsersId,
	debtId: DebtsId,
	updater: (debt: Debt) => Debt
) => {
	const modifiedDebtRef = createRef<Debt | undefined>();
	createController(trpc, userId).update((prevData) => {
		const matchedDebtIndex = prevData.findIndex((debt) => debt.id === debtId);
		if (matchedDebtIndex === -1) {
			return prevData;
		}
		modifiedDebtRef.current = prevData[matchedDebtIndex]!;
		return [
			...prevData.slice(0, matchedDebtIndex),
			updater(modifiedDebtRef.current),
			...prevData.slice(matchedDebtIndex + 1),
		].sort(sortByTimestamp);
	});
	return modifiedDebtRef.current;
};

export const add = (
	trpc: TRPCReactContext,
	userId: UsersId,
	nextDebt: Debt
) => {
	createController(trpc, userId).update((prevData) =>
		[...prevData, nextDebt].sort(sortByTimestamp)
	);
};

export const remove = (
	trpc: TRPCReactContext,
	userId: UsersId,
	debtId: DebtsId
) => {
	const removedDebtRef = createRef<Debt | undefined>();
	createController(trpc, userId).update((prevData) => {
		const matchedDebtIndex = prevData.findIndex((debt) => debt.id === debtId);
		if (matchedDebtIndex === -1) {
			return prevData;
		}
		removedDebtRef.current = prevData[matchedDebtIndex]!;
		return [
			...prevData.slice(0, matchedDebtIndex),
			...prevData.slice(matchedDebtIndex + 1),
		];
	});
	return removedDebtRef.current;
};
