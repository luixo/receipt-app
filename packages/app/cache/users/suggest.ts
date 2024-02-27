import type * as utils from "~app/cache/utils";
import type { TRPCReactContext } from "~app/trpc";

type Controller = TRPCReactContext["users"]["suggest"];

const invalidate = (controller: Controller) => controller.invalidate();

export const getController = ({ trpcContext }: utils.ControllerContext) => {
	const controller = trpcContext.users.suggest;
	return {
		invalidate: () => invalidate(controller),
	};
};
