import type { TRPCReactUtils } from "~app/trpc";

import type { ControllerContext } from "../../types";

type Controller = TRPCReactUtils["users"]["suggest"];

const invalidate = (controller: Controller) => controller.invalidate();

export const getController = ({ trpcUtils }: ControllerContext) => {
	const controller = trpcUtils.users.suggest;
	return {
		invalidate: () => invalidate(controller),
	};
};
