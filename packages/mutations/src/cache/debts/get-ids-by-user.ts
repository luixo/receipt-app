import type { TRPCQueryOutput } from "~app/trpc";
import type { DebtsId, UsersId } from "~db/models";
import type { ItemWithIndex } from "~utils/array";
import {
	addToArray,
	isSameOrder,
	removeFromArray,
	replaceInArray,
} from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getIdsByUser"];
}>;

type Debts = TRPCQueryOutput<"debts.getIdsByUser">;
type Debt = Debts[number];

const sortByTimestamp = (a: Debt, b: Debt) =>
	b.timestamp.valueOf() - a.timestamp.valueOf();

const updateDebts = (
	{ queryClient, procedure }: Controller,
	userId: UsersId,
	updater: UpdateFn<Debts>,
) =>
	queryClient.setQueryData(procedure.queryKey({ userId }), (prevDebts) => {
		if (!prevDebts) {
			return;
		}
		const nextDebts = updater(prevDebts);
		const sortedDebts = [...nextDebts].sort(sortByTimestamp);
		if (isSameOrder(prevDebts, sortedDebts)) {
			return;
		}
		return sortedDebts;
	});

const update =
	(controller: Controller, userId: UsersId, debtId: DebtsId) =>
	(updater: UpdateFn<Debt>) =>
		withRef<Debt | undefined>((ref) =>
			updateDebts(controller, userId, (debts) =>
				replaceInArray(debts, (debt) => debt.id === debtId, updater, ref),
			),
		).current;

const remove = (controller: Controller, userId: UsersId, debtId: DebtsId) =>
	withRef<ItemWithIndex<Debt> | undefined>((ref) =>
		updateDebts(controller, userId, (debts) =>
			removeFromArray(debts, (debt) => debt.id === debtId, ref),
		),
	).current;

const add = (
	controller: Controller,
	userId: UsersId,
	debt: Debt,
	index = 0,
) => {
	updateDebts(controller, userId, (debts) => addToArray(debts, debt, index));
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getIdsByUser };
	return {
		update: (userId: UsersId, debtId: DebtsId, updater: UpdateFn<Debt>) =>
			update(controller, userId, debtId)(updater),
		add: (userId: UsersId, nextDebt: Debt) => add(controller, userId, nextDebt),
		remove: (userId: UsersId, debtId: DebtsId) =>
			remove(controller, userId, debtId),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getIdsByUser };
	return {
		update: (
			userId: UsersId,
			debtId: DebtsId,
			updater: UpdateFn<Debt>,
			revertUpdater: SnapshotFn<Debt>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, userId, debtId),
				updater,
				revertUpdater,
			),
		add: (userId: UsersId, nextDebt: Debt) =>
			applyWithRevert(
				() => add(controller, userId, nextDebt),
				() => remove(controller, userId, nextDebt.id),
			),
		remove: (userId: UsersId, debtId: DebtsId) =>
			applyWithRevert(
				() => remove(controller, userId, debtId),
				({ item, index }) => add(controller, userId, item, index),
			),
	};
};
