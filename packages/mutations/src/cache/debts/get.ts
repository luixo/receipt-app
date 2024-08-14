import type { TRPCQueryOutput, TRPCReactUtils } from "~app/trpc";
import type { DebtsId } from "~db/models";

import type { ControllerContext, SnapshotFn, UpdateFn } from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = TRPCReactUtils["debts"]["get"];

type Debt = TRPCQueryOutput<"debts.get">;

const update =
	(controller: Controller, debtId: DebtsId) => (updater: UpdateFn<Debt>) =>
		withRef<Debt | undefined>((ref) => {
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
	withRef<Debt | undefined>((ref) => {
		ref.current = controller.getData({ id: debtId });
		return controller.invalidate({ id: debtId });
	}).current;

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.debts.get;
	return {
		update: (debtId: DebtsId, updater: UpdateFn<Debt>) =>
			update(controller, debtId)(updater),
		add: (debt: Debt) => upsert(controller, debt),
		remove: (debtId: DebtsId) => {
			remove(controller, debtId);
		},
	};
};

export const getRevertController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.debts.get;
	return {
		update: (
			debtId: DebtsId,
			updater: UpdateFn<Debt>,
			revertUpdater: SnapshotFn<Debt>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, debtId),
				updater,
				revertUpdater,
			),
		add: (debt: Debt) =>
			applyWithRevert(
				() => upsert(controller, debt),
				() => remove(controller, debt.id),
			),
		remove: (debtId: DebtsId) =>
			applyWithRevert(
				() => remove(controller, debtId),
				(snapshot) => upsert(controller, snapshot),
			),
	};
};
