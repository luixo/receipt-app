import { createGenericBroadController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

export const createController = (trpc: TRPCReactContext) =>
	createGenericBroadController(trpc, "users.getPaged");
