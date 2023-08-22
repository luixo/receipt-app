import * as utils from "app/cache/utils";
import type { TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import type { DebtsId } from "next-app/db/models";

type Controller = TRPCReactContext["debts"]["get"];

type Debt = TRPCQueryOutput<"debts.get">;

const update =
	(controller: Controller, debtId: DebtsId) =>
	(updater: utils.UpdateFn<Debt>) =>
		utils.withRef<Debt | undefined>((ref) => {
			controller.setData({ id: debtId }, (debt) => {
				if (!debt) {
					return;
				}
				ref.current = debt;
				return updater(debt);
			});
		}).current;

const upsert = (controller: Controller, debt: Debt) =>
	controller.setData({ id: debt.id }, debt);

const remove = (controller: Controller, debtId: DebtsId) =>
	utils.withRef<Debt | undefined>((ref) => {
		ref.current = controller.getData({ id: debtId });
		controller.invalidate({ id: debtId });
	}).current;

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.debts.get;
	return {
		update: (debtId: DebtsId, updater: utils.UpdateFn<Debt>) =>
			update(controller, debtId)(updater),
		add: (debt: Debt) => upsert(controller, debt),
		remove: (debtId: DebtsId) => {
			remove(controller, debtId);
		},
	};
};

export const getRevertController = ({
	trpcContext,
}: utils.ControllerContext) => {
	const controller = trpcContext.debts.get;
	return {
		update: (
			debtId: DebtsId,
			updater: utils.UpdateFn<Debt>,
			revertUpdater: utils.SnapshotFn<Debt>,
		) =>
			utils.applyUpdateFnWithRevert(
				update(controller, debtId),
				updater,
				revertUpdater,
			),
		add: (debt: Debt) =>
			utils.applyWithRevert(
				() => upsert(controller, debt),
				() => remove(controller, debt.id),
			),
		remove: (debtId: DebtsId) =>
			utils.applyWithRevert(
				() => remove(controller, debtId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
