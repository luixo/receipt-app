import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";

export const invalidate = (trpcContext: TRPCReactContext) =>
	createController(trpcContext).invalidate();
