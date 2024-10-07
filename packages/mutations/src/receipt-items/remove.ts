import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.remove",
	ReceiptsId
> = {
	onMutate:
		(controllerContext, receiptId) =>
		({ id: removedId }) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) => controller.removeItem(receiptId, removedId),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error removing item: ${error.message}`,
	}),
};
