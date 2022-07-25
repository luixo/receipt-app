import { TRPCReactContext } from "app/trpc";
import { UsersId } from "next-app/db/models";

import { createController } from "./controller";

export const remove = (trpc: TRPCReactContext, userId: UsersId) =>
	createController(trpc, userId).invalidate();

export const add = (
	trpc: TRPCReactContext,
	userId: UsersId,
	nextName: string
) => createController(trpc, userId).set(nextName);
