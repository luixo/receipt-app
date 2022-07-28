import { createGenericInfiniteBroadController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import { getRequiredState } from "./input";

export const createController = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId
) =>
	createGenericInfiniteBroadController(trpc, [
		"users.get-available",
		getRequiredState(receiptId),
	]);
