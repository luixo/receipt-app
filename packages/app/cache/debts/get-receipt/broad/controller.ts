import { createGenericBroadController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

export const createBroadController = (trpc: TRPCReactContext) =>
	createGenericBroadController(trpc, ["debts.getReceipt"]);
