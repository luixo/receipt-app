import { createGenericController } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

export const createController = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId
) => createGenericController(trpc, ["receipt-items.get", { receiptId }]);
