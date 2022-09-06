import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { DebtsId } from "next-app/db/models";

export const createController = (trpc: TRPCReactContext, id: DebtsId) =>
	createGenericController<"debts.get">(trpc.debts.get, { id });
