import type { TRPCQueryInput, TRPCQueryOutput } from "~app/trpc";
import type { PeerId } from "~db/ids";

import type { ControllerContext, ControllerWith, UpdateFn } from "../../types";
import { applyWithRevert, getAllInputs, getUpdatedData } from "../utils";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getPeersPaged"];
}>;

type Input = TRPCQueryInput<"debts.getPeersPaged">;
type Output = TRPCQueryOutput<"debts.getPeersPaged">;

const updatePage =
	({ queryClient, procedure }: Controller, input: Input) =>
	(updater: UpdateFn<Output>) =>
		queryClient.setQueryData(procedure.queryKey(input), (result) =>
			getUpdatedData(result, updater),
		);

const updatePages =
	(controller: Controller) =>
	(updater: UpdateFn<PeerId[], PeerId[], Input>) => {
		const inputs = getAllInputs<"debts.getPeersPaged">(
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

const updatePeer = (
	{ queryClient, procedure }: Controller,
	allDebts: TRPCQueryOutput<"debts.getAllPeer"> | undefined,
	peerId: PeerId,
) => {
	if (!allDebts) {
		return;
	}
	return updatePages({ queryClient, procedure })((peerIds, input) => {
		// List with "showResolved" show every peer anyway
		if (input.filters?.showResolved) {
			return peerIds;
		}
		// If peer will have no debts - we should update all pages
		if (allDebts.items.every((debt) => debt.sum === 0)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
		}
		// If peer will have debts and they're not on the page - they might be next time
		// We should invalidate query to probably add them in the list
		if (!peerIds.includes(peerId)) {
			void queryClient.invalidateQueries(procedure.queryFilter(input));
		}
		return peerIds;
	});
};

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getPeersPaged };
	return {
		update: (peerId: PeerId) => {
			setTimeout(() => {
				const allDebts = queryClient.getQueryData(
					trpc.debts.getAllPeer.queryKey({ peerId }),
				);
				updatePeer(controller, allDebts, peerId);
			});
		},
		invalidate: () => {
			void queryClient.invalidateQueries(
				trpc.debts.getPeersPaged.queryFilter(),
			);
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getPeersPaged };
	return {
		update: async (peerId: PeerId) => {
			await Promise.resolve();
			const allDebts = queryClient.getQueryData(
				trpc.debts.getAllPeer.queryKey({ peerId }),
			);
			const updatePeerBinded = () => updatePeer(controller, allDebts, peerId);
			return applyWithRevert(updatePeerBinded, updatePeerBinded);
		},
	};
};
