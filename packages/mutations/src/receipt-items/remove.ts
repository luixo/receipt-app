import type { ReceiptsId } from "~db/models";
import { mergeErrors } from "~mutations/utils";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.remove",
	{ receiptId: ReceiptsId }
> = {
	mutationKey: "receiptItems.remove",
	onMutate:
		(controllerContext, { receiptId }) =>
		({ id: removedId }) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) => controller.removeItem(receiptId, removedId),
				getPaged: undefined,
			}),
	errorToastOptions: () => (errors) => ({
		text: `Error removing item${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
	}),
};
