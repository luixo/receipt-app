import * as utils from "app/cache/utils";
import { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { DebtsId, ReceiptsId } from "next-app/db/models";

type Controller = utils.GenericController<"debts.getByReceiptId">;

type Debt = NonNullable<TRPCQueryOutput<"debts.getByReceiptId">>;

const update =
	(controller: Controller, receiptId: ReceiptsId) =>
	(updater: utils.UpdateFn<Debt>) =>
		utils.withRef<Debt | undefined>((ref) => {
			controller.update((_input, debt) => {
				if (!debt || debt.receiptId !== receiptId) {
					return debt;
				}
				ref.current = debt;
				return updater(debt);
			});
		}).current;

const upsert = (controller: Controller, debt: Debt) => {
	if (!debt || !debt.receiptId) {
		return;
	}
	controller.upsert({ receiptId: debt.receiptId }, debt);
};

const remove = (
	controller: Controller,
	receiptId: ReceiptsId,
	debtId: DebtsId
) =>
	utils.withRef<Debt | undefined>((ref) =>
		controller.invalidate((input, debt) => {
			if (input.receiptId !== receiptId || !debt) {
				return false;
			}
			if (debt.id === debtId) {
				ref.current = debt;
				return true;
			}
			return false;
		})
	).current;

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getByReceiptId");
	return {
		update: (receiptId: ReceiptsId, updater: utils.UpdateFn<Debt>) => {
			update(controller, receiptId)(updater);
		},
		add: (debt: Debt) => upsert(controller, debt),
		remove: (receiptId: ReceiptsId, debtId: DebtsId) =>
			remove(controller, receiptId, debtId),
	};
};

export const getRevertController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "debts.getByReceiptId");
	return {
		update: (
			receiptId: ReceiptsId,
			// It is intended that we don't use debtId here
			// This query (debts.getByReceiptId) is only used if you're not a receipt owner
			// Therefore you can only have one debt for given receipt id
			updater: utils.UpdateFn<Debt>,
			revertUpdater: utils.SnapshotFn<Debt>
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, receiptId),
				updater,
				revertUpdater
			),
		add: (debt: Debt) =>
			utils.applyWithRevert(
				() => upsert(controller, debt),
				() => {
					if (debt.receiptId) {
						remove(controller, debt.receiptId, debt.id);
					}
				}
			),
		remove: (receiptId: ReceiptsId, debtId: DebtsId) =>
			utils.applyWithRevert(
				() => remove(controller, receiptId, debtId),
				(snapshot) => upsert(controller, snapshot)
			),
	};
};
