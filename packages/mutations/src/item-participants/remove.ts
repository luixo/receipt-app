import type { ReceiptsId } from "~db/models";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		cache.receipts.updateRevert(controllerContext, {
			get: (controller) =>
				controller.removeItemPart(
					receiptId,
					variables.itemId,
					variables.userId,
				),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error removing participant(s): ${error.message}`,
	}),
};
