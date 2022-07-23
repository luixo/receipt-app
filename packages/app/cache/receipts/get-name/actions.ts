import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { ReceiptsGetNameInput } from "./types";

export const update = (
	trpc: TRPCReactContext,
	input: ReceiptsGetNameInput,
	nextName: string
) => createController(trpc, input).set(nextName);

export const remove = (trpc: TRPCReactContext, input: ReceiptsGetNameInput) =>
	createController(trpc, input).invalidate();
