import { TRPCReactContext, InvalidateArgs } from "app/trpc";

import { createController } from "./controller";

export const invalidate = (trpc: TRPCReactContext, ...args: InvalidateArgs) =>
	createController(trpc).invalidate(...args);
