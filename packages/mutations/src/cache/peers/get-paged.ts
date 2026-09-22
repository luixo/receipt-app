import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { PeerId } from "~db/ids";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import {
	applyUpdateFnWithRevert,
	getAllInputs,
	getUpdatedData,
} from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["peers"]["getPaged"];
}>;
type Input = TRPCQueryInput<"peers.getPaged">;
type Output = TRPCQueryOutput<"peers.getPaged">;

const invalidate = ({ queryClient, procedure }: Controller) => {
	const inputs = getAllInputs<"peers.getPaged">(
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
	(updater: UpdateFn<PeerId[], PeerId[], Input>) => {
		const inputs = getAllInputs<"peers.getPaged">(
			controller.queryClient,
			controller.procedure.queryKey(),
		);
		for (const input of inputs) {
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
		}
	};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.getPaged };
	return {
		invalidate: () => invalidate(controller),
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.getPaged };
	return {
		remove: (peerId: PeerId) =>
			applyUpdateFnWithRevert(
				updatePages(controller),
				(items) =>
					items.includes(peerId)
						? items.filter((item) => item !== peerId)
						: items,
				() => (items) => {
					void invalidate(controller);
					return items;
				},
			),
	};
};
