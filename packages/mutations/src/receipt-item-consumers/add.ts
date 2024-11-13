import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.add",
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						variables.part,
					),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error adding consumer(s): ${error.message}`,
	}),
};
