import * as utils from "~app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "~app/trpc";
import type { ItemWithIndex } from "~app/utils/array";
import {
	addToArray,
	isSameOrder,
	removeFromArray,
	replaceInArray,
} from "~app/utils/array";
import type { DebtsId, UsersId } from "~web/db/models";

type Controller = TRPCReactContext["debts"]["getUser"];

type Debts = TRPCQueryOutput<"debts.getUser">;
type Debt = Debts[number];

const sortByTimestamp = (a: Debt, b: Debt) =>
	b.timestamp.valueOf() - a.timestamp.valueOf();

const updateDebts = (
	controller: Controller,
	userId: UsersId,
	updater: utils.UpdateFn<Debts>,
) =>
	controller.setData({ userId }, (prevDebts) => {
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
	(updater: utils.UpdateFn<Debt>) =>
		utils.withRef<Debt | undefined>((ref) =>
			updateDebts(controller, userId, (debts) =>
				replaceInArray(debts, (debt) => debt.id === debtId, updater, ref),
			),
		).current;

const remove = (controller: Controller, userId: UsersId, debtId: DebtsId) =>
	utils.withRef<ItemWithIndex<Debt> | undefined>((ref) =>
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

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.debts.getUser;
	return {
		update: (userId: UsersId, debtId: DebtsId, updater: utils.UpdateFn<Debt>) =>
			update(controller, userId, debtId)(updater),
		add: (userId: UsersId, nextDebt: Debt) => add(controller, userId, nextDebt),
		remove: (userId: UsersId, debtId: DebtsId) =>
			remove(controller, userId, debtId),
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.debts.getUser;
	return {
		update: (
			userId: UsersId,
			debtId: DebtsId,
			updater: utils.UpdateFn<Debt>,
			revertUpdater: utils.SnapshotFn<Debt>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, userId, debtId),
				updater,
				revertUpdater,
			),
		add: (userId: UsersId, nextDebt: Debt) =>
			utils.applyWithRevert(
				() => add(controller, userId, nextDebt),
				() => remove(controller, userId, nextDebt.id),
			),
		remove: (userId: UsersId, debtId: DebtsId) =>
			utils.applyWithRevert(
				() => remove(controller, userId, debtId),
				({ item, index }) => add(controller, userId, item, index),
			),
	};
};
