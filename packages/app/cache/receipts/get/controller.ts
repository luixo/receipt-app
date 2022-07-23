import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { ReceiptsGetInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: ReceiptsGetInput
) => createGenericController(trpc, ["receipts.get", input]);
