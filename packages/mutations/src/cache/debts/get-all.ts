import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import { replaceInArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	SnapshotFn,
	UpdateFn,
} from "../../types";
import { applyUpdateFnWithRevert, withRef } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getAll"];
}>;

type Debts = TRPCQueryOutput<"debts.getAll">;
type Debt = Debts[number];

const update =
	({ queryClient, procedure }: Controller, currencyCode: CurrencyCode) =>
	(updater: UpdateFn<number>) =>
		withRef<Debt | undefined>((ref) => {
			queryClient.setQueryData(procedure.queryKey(), (prevData) =>
				prevData
					? replaceInArray<(typeof prevData)[number]>(
							prevData,
							(entry) => entry.currencyCode === currencyCode,
							(entry) => ({ ...entry, sum: updater(entry.sum) }),
							ref,
						)
					: undefined,
			);
		}).current?.sum;

const invalidate =
	({ queryClient, procedure }: Controller) =>
	() =>
		queryClient.invalidateQueries(procedure.queryFilter());

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAll };
	return {
		update: (currencyCode: CurrencyCode, updater: UpdateFn<number>) =>
			update(controller, currencyCode)(updater),
		invalidate: invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getAll };
	return {
		update: (
			currencyCode: CurrencyCode,
			updater: UpdateFn<number>,
			revertUpdater: SnapshotFn<number>,
		) =>
			applyUpdateFnWithRevert(
				update(controller, currencyCode),
				updater,
				revertUpdater,
			),
		invalidate: invalidate(controller),
	};
};
