import type { TRPCQueryOutput } from "~app/trpc";
import type { DebtsId } from "~db/models";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, applyWithRevert, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["get"];
}>;

type Debt = TRPCQueryOutput<"debts.get">;

const update =
	({ queryClient, procedure }: Controller, debtId: DebtsId) =>
	(updater: UpdateFn<Debt>) =>
		withRef<Debt | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ id: debtId }), (debt) => {
				if (!debt) {
					return;
				}
				ref.current = debt;
				return updater(debt);
			});
		}).current;

const upsert = ({ queryClient, procedure }: Controller, debt: Debt) =>
	queryClient.setQueryData(procedure.queryKey({ id: debt.id }), debt);

const remove = ({ queryClient, procedure }: Controller, debtId: DebtsId) =>
	withRef<Debt | undefined>((ref) => {
		ref.current = queryClient.getQueryData(procedure.queryKey({ id: debtId }));
		return queryClient.invalidateQueries(procedure.queryFilter({ id: debtId }));
	}).current;

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.get };
	return {
		update: (debtId: DebtsId, updater: UpdateFn<Debt>) =>
			update(controller, debtId)(updater),
		add: (debt: Debt) => upsert(controller, debt),
		remove: (debtId: DebtsId) => {
			remove(controller, debtId);
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.get };
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
