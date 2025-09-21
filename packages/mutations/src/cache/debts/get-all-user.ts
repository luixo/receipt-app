import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { UserId } from "~db/ids";
import { upsertInArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, getUpdatedData, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getAllUser"];
}>;

type AggregatedDebts = TRPCQueryOutput<"debts.getAllUser">;
type AggregatedDebt = AggregatedDebts[number];

const updateAllSums =
	({ queryClient, procedure }: Controller, userId: UserId) =>
	(updater: UpdateFn<AggregatedDebts>) =>
		withRef<AggregatedDebts | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ userId }), (prevDebts) => {
				ref.current = prevDebts;
				return getUpdatedData(prevDebts, updater);
			});
		});

const updateSum =
	(controller: Controller, userId: UserId, currencyCode: CurrencyCode) =>
	(updater: UpdateFn<number>) =>
		withRef<AggregatedDebt | undefined>((ref) => {
			updateAllSums(
				controller,
				userId,
			)((prevDebts) =>
				upsertInArray<(typeof prevDebts)[number]>(
					prevDebts,
					(entry) => entry.currencyCode === currencyCode,
					(entry) => ({ ...entry, sum: updater(entry.sum) }),
					{ currencyCode, sum: updater(0) },
					ref,
				),
			);
		}).current?.sum;

const invalidate =
	({ queryClient, procedure }: Controller) =>
	(userId: UserId) =>
		queryClient.invalidateQueries(procedure.queryFilter({ userId }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAllUser };
	return {
		update: (
			userId: UserId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
		) => updateSum(controller, userId, currencyCode)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAllUser };
	return {
		update: (
			userId: UserId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
			revertUpdater: SnapshotFn<number>,
		) =>
			applyUpdateFnWithRevert(
				updateSum(controller, userId, currencyCode),
				updater,
				revertUpdater,
			),
		invalidate: invalidate(controller),
	};
};
