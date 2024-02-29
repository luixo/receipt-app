import type { TRPCReactContext } from "~app/trpc";

import type { ControllerContext } from "../../types";

type Controller = TRPCReactContext["users"]["suggest"];

const invalidate = (controller: Controller) => controller.invalidate();

export const getController = ({ trpcContext }: ControllerContext) => {
	const controller = trpcContext.users.suggest;
	return {
		invalidate: () => invalidate(controller),
	};
};
