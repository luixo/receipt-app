import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

export const createController = (trpc: TRPCReactContext) =>
	createGenericController<"debts.getByUsers">(trpc.debts.getByUsers);
