import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { UsersGetInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: UsersGetInput
) => createGenericController(trpc, ["users.get", input]);
