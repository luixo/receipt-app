import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { ReceiptItemsGetInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput
) => createGenericController(trpc, ["receipt-items.get", input]);
