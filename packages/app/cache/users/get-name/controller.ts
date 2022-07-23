import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { UsersGetNameInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: UsersGetNameInput
) => createGenericController(trpc, ["users.get-name", input]);
