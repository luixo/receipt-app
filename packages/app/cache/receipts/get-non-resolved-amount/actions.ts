import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";

export const update = (
	trpc: TRPCReactContext,
	updater: (prevAmount: number) => number
) => createController(trpc).update(updater);
