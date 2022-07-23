import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { ReceiptsGetNameInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: ReceiptsGetNameInput
) => createGenericController(trpc, ["receipts.get-name", input]);
