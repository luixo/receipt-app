import { createGenericInfiniteController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";

import { ReceiptsGetPagedInput } from "./types";

export const createController = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput
) => createGenericInfiniteController(trpc, ["receipts.get-paged", input]);
