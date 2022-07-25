import { createGenericInfiniteController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { getState } from "./input";

export const createController = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId
) =>
	createGenericInfiniteController(trpc, [
		"users.get-available",
		getState(receiptId),
	]);
