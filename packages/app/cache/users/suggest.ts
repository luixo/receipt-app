import * as utils from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { alwaysTrue } from "app/utils/utils";

type Controller = utils.GenericController<"users.suggest">;

const invalidate = (controller: Controller) =>
	controller.invalidate(alwaysTrue);

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "users.suggest");
	return {
		invalidate: () => invalidate(controller),
	};
};
