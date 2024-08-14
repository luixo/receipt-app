import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"itemParticipants.add",
	ReceiptsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) =>
		updateRevertReceipts(controllerContext, {
			get: (controller) =>
				controller.addItemParts(receiptId, variables.itemId, variables.userIds),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		}),
	errorToastOptions: () => (error) => ({
		text: `Error adding participant(s): ${error.message}`,
	}),
};
