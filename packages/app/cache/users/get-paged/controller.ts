import { createGenericInfiniteController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { UsersGetPagedInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: UsersGetPagedInput
) => createGenericInfiniteController(trpc, ["users.get-paged", input]);
