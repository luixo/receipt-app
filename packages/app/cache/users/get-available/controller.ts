import { createGenericInfiniteController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { GetAvailableUsersInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: GetAvailableUsersInput
) => createGenericInfiniteController(trpc, ["users.get-available", input]);
