import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		updateRevertReceipts(controllerContext, {
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
