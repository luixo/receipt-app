import { createGenericInfiniteBroadController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

export const createController = (trpc: TRPCReactContext) =>
	createGenericInfiniteBroadController(trpc, ["receipts.get-paged"]);
