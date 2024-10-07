import { updateRevert as updateRevertReceiptTransferIntentions } from "../cache/receipt-transfer-intentions";
import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"receiptTransferIntentions.accept"> =
	{
		onMutate:
			(controllerContext) =>
			({ receiptId }) =>
				updateRevertReceiptTransferIntentions(controllerContext, {
					getAll: (controller) => controller.inbound.remove(receiptId),
				}),
		onSuccess: (controllerContext) => () =>
			updateReceipts(controllerContext, {
				getPaged: (controller) => controller.invalidate(),
				get: undefined,
			}),
		successToastOptions: () => () => ({
			text: `Receipt was successfully accepted`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error accepting receipt: ${error.message}`,
		}),
	};
