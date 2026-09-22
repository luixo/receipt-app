import type { ControllerContext, ControllerWith } from "../../types";

type Controller = ControllerWith<{
	procedure: ControllerContext["trpc"]["peers"]["suggest"];
}>;

const invalidate = ({ queryClient, procedure }: Controller) =>
	queryClient.invalidateQueries(procedure.queryFilter());

export const getController = ({ queryClient, trpc }: ControllerContext) => {
	const controller = { queryClient, procedure: trpc.peers.suggest };
	return {
		invalidate: () => invalidate(controller),
	};
};
