import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { UsersGetNameInput } from "./types";

export const remove = (trpc: TRPCReactContext, input: UsersGetNameInput) =>
	createController(trpc, input).invalidate();

export const add = (
	trpc: TRPCReactContext,
	input: UsersGetNameInput,
	nextName: string
) => createController(trpc, input).set(nextName);
