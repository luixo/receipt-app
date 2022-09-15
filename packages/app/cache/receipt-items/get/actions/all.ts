import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/src/db/models";

import { createController } from "../controller";

export const get = (trpc: TRPCReactContext, receiptId: ReceiptsId) => {
	const controller = createController(trpc, receiptId);
	return controller.get();
};
