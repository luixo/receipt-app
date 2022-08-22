import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

export const createController = (trpc: TRPCReactContext, userId: UsersId) =>
	createGenericController(trpc, ["debts.get-user", { userId }]);
