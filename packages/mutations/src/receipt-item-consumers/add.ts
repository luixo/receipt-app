import type { ReceiptsId } from "~db/models";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
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
						new Date(),
					),
				getPaged: undefined,
			}),
	onSuccess:
		(controllerContext, { receiptId }) =>
		(result, variables) =>
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						(consumer) => ({ ...consumer, createdAt: result.createdAt }),
					),
				getPaged: undefined,
			}),
	errorToastOptions: () => (error) => ({
		text: `Error adding consumer(s): ${error.message}`,
	}),
};
