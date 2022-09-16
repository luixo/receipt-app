import * as utils from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

export const getController = (trpc: TRPCReactContext) => {
	const controller = utils.createController(trpc, "receiptItems.get");
	return {
		get: (receiptId: ReceiptsId) =>
			controller.get().find(([input]) => input.receiptId === receiptId)?.[1],
	};
};
