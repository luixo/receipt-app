import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.get">;

type Debt = TRPCQueryOutput<"debts.get">;

const update =
	(controller: Controller, debtId: DebtsId) =>
	(updater: utils.UpdateFn<Debt>) =>
		utils.withRef<Debt | undefined>((ref) => {
			controller.update((input, debt) => {
				if (input.id !== debtId) {
					return;
				}
				ref.current = debt;
				return updater(debt);
			});
		}).current;

const upsert = (controller: Controller, debt: Debt) =>
	controller.upsert({ id: debt.id }, debt);

const remove = (controller: Controller, debtId: DebtsId) =>
	utils.withRef<Debt | undefined>((ref) => {
		controller.invalidate((input, debt) => {
			if (input.id !== debtId) {
				return false;
			}
			ref.current = debt;
			return true;
		});
	}).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.get");
	return {
		update: (debtId: DebtsId, updater: utils.UpdateFn<Debt>) =>
			update(controller, debtId)(updater),
		add: (debt: Debt) => upsert(controller, debt),
		remove: (debtId: DebtsId) => {
			remove(controller, debtId);
		},
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.get");
	return {
		update: (
			debtId: DebtsId,
			updater: utils.UpdateFn<Debt>,
			revertUpdater: utils.SnapshotFn<Debt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, debtId),
				updater,
				revertUpdater
			),
		add: (debt: Debt) =>
			utils.applyWithRevert(
				() => upsert(controller, debt),
				() => remove(controller, debt.id)
			),
		remove: (debtId: DebtsId) =>
			utils.applyWithRevert(
				() => remove(controller, debtId),
				(snapshot) => upsert(controller, snapshot)
			),
	};
};
