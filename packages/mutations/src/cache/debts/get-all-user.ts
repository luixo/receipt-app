import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db/models";
import { upsertInArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getAllUser"];
}>;

type AggregatedDebts = TRPCQueryOutput<"debts.getAllUser">;
type AggregatedDebt = AggregatedDebts[number];

const updateSum =
	(
		{ queryClient, procedure }: Controller,
		userId: UsersId,
		currencyCode: CurrencyCode,
	) =>
	(updater: UpdateFn<number>) =>
		withRef<AggregatedDebt | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey({ userId }), (prevData) =>
				prevData
					? upsertInArray<(typeof prevData)[number]>(
							prevData,
							(entry) => entry.currencyCode === currencyCode,
							(entry) => ({ ...entry, sum: updater(entry.sum) }),
							{ currencyCode, sum: updater(0) },
							ref,
					  )
					: undefined,
			);
		}).current?.sum;

const invalidate =
	({ queryClient, procedure }: Controller) =>
	(userId: UsersId) =>
		queryClient.invalidateQueries(procedure.queryFilter({ userId }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAllUser };
	return {
		update: (
			userId: UsersId,
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
			userId: UsersId,
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
