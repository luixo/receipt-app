import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

export const createController = (trpc: TRPCReactContext) =>
	createGenericController<"receipts.getNonResolvedAmount">(
		trpc.receipts.getNonResolvedAmount
	);
