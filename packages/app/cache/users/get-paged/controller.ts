import { createGenericInfiniteController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { getState } from "./input";

export const createController = (trpc: TRPCReactContext) =>
	createGenericInfiniteController(trpc, ["users.get-paged", getState()]);
