import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.remove",
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.removeItemPart(
						receiptId,
						variables.itemId,
						variables.userId,
					),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error removing consumer(s): ${error.message}`,
	}),
};
