import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { UserId } from "~db/ids";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import {
	applyUpdateFnWithRevert,
	getAllInputs,
	getUpdatedData,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["users"]["getPaged"];
}>;
type Input = TRPCQueryInput<"users.getPaged">;
type Output = TRPCQueryOutput<"users.getPaged">;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"users.getPaged">(
		queryClient,
		procedure.queryKey(),
	);
	return inputs.map((input) =>
		queryClient.invalidateQueries(procedure.queryFilter(input)),
	);
};

const updatePage =
	({ queryClient, procedure }: Controller, input: Input) =>
	(updater: UpdateFn<Output>) =>
		queryClient.setQueryData(procedure.queryKey(input), (result) =>
			getUpdatedData(result, updater),
		);

const updatePages =
	(controller: Controller) =>
	(updater: UpdateFn<UserId[], UserId[], Input>) => {
		const inputs = getAllInputs<"users.getPaged">(
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

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.users.getPaged };
	return {
		remove: (userId: UserId) =>
			applyUpdateFnWithRevert(
				updatePages(controller),
				(items) =>
					items.includes(userId)
						? items.filter((item) => item !== userId)
						: items,
				() => (items) => {
					void invalidate(controller);
					return items;
				},
			),
	};
};
