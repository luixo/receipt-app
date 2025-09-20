import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { ReceiptsId } from "~db/models";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import {
	applyUpdateFnWithRevert,
	getAllInputs,
	getUpdatedData,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["receipts"]["getPaged"];
}>;
type Input = TRPCQueryInput<"receipts.getPaged">;
type Output = TRPCQueryOutput<"receipts.getPaged">;
type OutputItem = Output["items"][number];

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"receipts.getPaged">(
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
	(updater: UpdateFn<OutputItem[], OutputItem[], Input>) => {
		const inputs = getAllInputs<"receipts.getPaged">(
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
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.receipts.getPaged };
	return {
		remove: (receiptId: ReceiptsId) =>
			applyUpdateFnWithRevert(
				updatePages(controller),
				(items) =>
					items.some((item) => item.id === receiptId)
						? items.filter((item) => item.id !== receiptId)
						: items,
				() => (items) => {
					void invalidate(controller);
					return items;
				},
			),
	};
};
