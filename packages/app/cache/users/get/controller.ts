import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

export const createController = (trpc: TRPCReactContext, id: UsersId) =>
	createGenericController(trpc, ["users.get", { id }]);
