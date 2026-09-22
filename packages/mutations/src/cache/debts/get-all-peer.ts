import type { AggregatedDebt, AggregatedDebts } from "~app/trpc-types";
import type { CurrencyCode } from "~app/utils/currency";
import type { PeerId } from "~db/ids";
import { upsertInArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, getUpdatedData, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getAllPeer"];
}>;

const updateAllSums =
	({ queryClient, procedure }: Controller, peerId: PeerId) =>
	(updater: UpdateFn<AggregatedDebt[]>) =>
		withRef<AggregatedDebts | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ peerId }), (prevDebts) => {
				ref.current = prevDebts;
				return getUpdatedData(prevDebts, (prevData) => ({
					...prevData,
					items: updater(prevData.items),
				}));
			});
		});

const updateSum =
	(controller: Controller, peerId: PeerId, currencyCode: CurrencyCode) =>
	(updater: UpdateFn<number>) =>
		withRef<AggregatedDebt | undefined>((ref) => {
			updateAllSums(
				controller,
				peerId,
			)((prevDebts) =>
				upsertInArray<(typeof prevDebts)[number]>(
					prevDebts,
					(entry) => entry.currencyCode === currencyCode,
					(entry) => ({ ...entry, sum: updater(entry.sum) }),
					{ currencyCode, sum: 0 },
					ref,
				),
			);
		}).current?.sum;

const invalidate =
	({ queryClient, procedure }: Controller) =>
	(peerId: PeerId) =>
		queryClient.invalidateQueries(procedure.queryFilter({ peerId }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAllPeer };
	return {
		update: (
			peerId: PeerId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
		) => updateSum(controller, peerId, currencyCode)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAllPeer };
	return {
		update: (
			peerId: PeerId,
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
			revertUpdater: SnapshotFn<number>,
		) =>
			applyUpdateFnWithRevert(
				updateSum(controller, peerId, currencyCode),
				updater,
				revertUpdater,
			),
		invalidate: invalidate(controller),
	};
};
