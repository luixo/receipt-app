import * as utils from "app/cache/utils";
import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.get">;

type Debt = TRPCQueryOutput<"debts.get">;

type Selector = TRPCQueryInput<"debts.get">;

const update =
	(controller: Controller, selector: Selector) =>
	(updater: utils.UpdateFn<Debt>) =>
		utils.withRef<Debt | undefined>((ref) => {
			controller.update((input, debt) => {
				if (
					"id" in selector &&
					(!("id" in input) || input.id !== selector.id)
				) {
					return;
				}
				if (
					"receiptId" in selector &&
					(!("receiptId" in input) || input.receiptId !== selector.receiptId)
				) {
					return;
				}
				ref.current = debt;
				return updater(debt);
			});
		}).current;

const upsert = (controller: Controller, debt: Debt) =>
	controller.upsert({ id: debt.id }, debt);

const remove = (controller: Controller, selector: Selector) =>
	utils.withRef<Debt | undefined>((ref) => {
		controller.invalidate((input, debt) => {
			if ("id" in selector && (!("id" in input) || input.id !== selector.id)) {
				return false;
			}
			if (
				"receiptId" in selector &&
				(!("receiptId" in input) || input.receiptId !== selector.receiptId)
			) {
				return false;
			}
			ref.current = debt;
			return true;
		});
	}).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.get");
	return {
		update: (selector: Selector, updater: utils.UpdateFn<Debt>) =>
			update(controller, selector)(updater),
		add: (debt: Debt) => upsert(controller, debt),
		remove: (selector: Selector) => {
			remove(controller, selector);
		},
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.get");
	return {
		update: (
			selector: Selector,
			updater: utils.UpdateFn<Debt>,
			revertUpdater: utils.SnapshotFn<Debt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, selector),
				updater,
				revertUpdater
			),
		add: (debt: Debt) =>
			utils.applyWithRevert(
				() => upsert(controller, debt),
				() => remove(controller, { id: debt.id })
			),
		remove: (debtId: DebtsId) =>
			utils.applyWithRevert(
				() => remove(controller, { id: debtId }),
				(snapshot) => upsert(controller, snapshot)
			),
	};
};
