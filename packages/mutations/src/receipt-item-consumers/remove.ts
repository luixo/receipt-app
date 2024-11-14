import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.remove",
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.removePayer(receiptId, variables.userId),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.removeItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
					),
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ receiptId }) =>
		(error, variables) => ({
			text: `Error removing ${
				variables.itemId === receiptId ? "payer" : "consumer"
			}(s): ${error.message}`,
		}),
};
