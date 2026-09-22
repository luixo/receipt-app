import type { TRPCQueryInput } from "~app/trpc";
import type { PeerId } from "~db/ids";

import type { ControllerContext, ControllerWith } from "../../types";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["debts"]["getByPeerPaged"];
}>;

type Filters = Omit<Partial<TRPCQueryInput<"debts.getByPeerPaged">>, "peerId">;

const invalidate = (
	{ queryClient, procedure }: Controller,
	peerId: PeerId,
	filters?: Filters,
) =>
	queryClient.invalidateQueries(procedure.queryFilter({ peerId, ...filters }));

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getByPeerPaged };
	return {
		invalidate: (peerId: PeerId, filters?: Filters) => {
			void invalidate(controller, peerId, filters);
		},
	};
};

export const getRevertController = ({
	queryClient,
	trpc,
}: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.debts.getByPeerPaged };
	return {
		invalidate: (peerId: PeerId, filters?: Filters) => {
			void invalidate(controller, peerId, filters);
		},
	};
};
