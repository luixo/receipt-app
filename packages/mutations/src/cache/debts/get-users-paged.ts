import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { UsersId } from "~db/models";
import { removeFromArray } from "~utils/array";

import type {
	ControllerContext,
	ControllerWith,
	UpdateFn,
	UpdaterRevertResult,
} from "../../types";
import { applyWithRevert, getAllInputs } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getUsersPaged"];
}>;

type Input = TRPCQueryInput<"debts.getUsersPaged">;

const updatePages =
	({ queryClient, procedure }: Controller) =>
	(updater: UpdateFn<UsersId[], UsersId[], Input>) => {
		const snapshots: {
			input: Input;
			items: UsersId[];
		}[] = [];
		const inputs = getAllInputs<"debts.getUsersPaged">(
			queryClient,
			procedure.queryKey(),
		);
		inputs.forEach((input) => {
			queryClient.setQueryData(procedure.queryKey(input), (result) => {
				if (!result) {
					return;
				}
				const nextItems = updater(result.items, input);
				if (nextItems === result.items) {
					return result;
				}
				snapshots.push({
					input,
					items: result.items,
				});
				return { ...result, items: nextItems };
			});
		});
		return snapshots;
	};

const updateUser = (
	{ queryClient, procedure }: Controller,
	allDebts: TRPCQueryOutput<"debts.getAllUser"> | undefined,
	userId: UsersId,
) => {
	if (!allDebts) {
		return;
	}
	return updatePages({ queryClient, procedure })((userIds, input) => {
		// List with "showResolved" show every user anyway
		if (input.filters?.showResolved) {
			return userIds;
		}
		// If user will have no debts - they should be removed from "only non resolved" list
		if (!allDebts.some((debt) => debt.sum !== 0)) {
			return removeFromArray(
				userIds,
				(lookupUserId) => lookupUserId !== userId,
			);
		}
		// If user will have debts and they're not in the "only non-resolved" list
		// We should invalidate query to add them in the list
		if (!userIds.includes(userId)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
			return [];
		}
		return userIds;
	});
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getUsersPaged };
	return {
		update: (userId: UsersId) => {
			setImmediate(() => {
				const allDebts = queryClient.getQueryData(
					trpc.debts.getAllUser.queryKey({ userId }),
				);
				updateUser(controller, allDebts, userId);
			});
		},
		invalidate: () => {
			void queryClient.invalidateQueries(
				trpc.debts.getUsersPaged.queryFilter(),
			);
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getUsersPaged };
	return {
		update: async (userId: UsersId) =>
			new Promise<UpdaterRevertResult | undefined>((resolve) => {
				setImmediate(() => {
					const allDebts = queryClient.getQueryData(
						trpc.debts.getAllUser.queryKey({ userId }),
					);
					const updateUserBinded = () =>
						updateUser(controller, allDebts, userId);
					resolve(applyWithRevert(updateUserBinded, updateUserBinded));
				});
			}),
	};
};
