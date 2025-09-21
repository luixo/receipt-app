import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { UserId } from "~db/ids";

import type {
	ControllerContext,
	ControllerWith,
	UpdateFn,
	UpdaterRevertResult,
} from "../../types";
import { applyWithRevert, getAllInputs, getUpdatedData } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getUsersPaged"];
}>;

type Input = TRPCQueryInput<"debts.getUsersPaged">;
type Output = TRPCQueryOutput<"debts.getUsersPaged">;

const updatePage =
	({ queryClient, procedure }: Controller, input: Input) =>
	(updater: UpdateFn<Output>) =>
		queryClient.setQueryData(procedure.queryKey(input), (result) =>
			getUpdatedData(result, updater),
		);

const updatePages =
	(controller: Controller) =>
	(updater: UpdateFn<UserId[], UserId[], Input>) => {
		const inputs = getAllInputs<"debts.getUsersPaged">(
			controller.queryClient,
			controller.procedure.queryKey(),
		);
		inputs.forEach((input) => {
			updatePage(
				controller,
				input,
			)((page) => {
				const nextItems = updater(page.items, input);
				if (nextItems === page.items) {
					return page;
				}
				return { ...page, items: nextItems };
			});
		});
	};

const updateUser = (
	{ queryClient, procedure }: Controller,
	allDebts: TRPCQueryOutput<"debts.getAllUser"> | undefined,
	userId: UserId,
) => {
	if (!allDebts) {
		return;
	}
	return updatePages({ queryClient, procedure })((userIds, input) => {
		// List with "showResolved" show every user anyway
		if (input.filters?.showResolved) {
			return userIds;
		}
		// If user will have no debts - we should update all pages
		if (allDebts.every((debt) => debt.sum === 0)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
		}
		// If user will have debts and they're not on the page - they might be next time
		// We should invalidate query to probably add them in the list
		if (!userIds.includes(userId)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
		}
		return userIds;
	});
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getUsersPaged };
	return {
		update: (userId: UserId) => {
			setTimeout(() => {
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
		update: async (userId: UserId) =>
			new Promise<UpdaterRevertResult | undefined>((resolve) => {
				setTimeout(() => {
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
