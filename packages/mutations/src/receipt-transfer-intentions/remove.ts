import { updateRevert as updateRevertReceiptTransferIntentions } from "../cache/receipt-transfer-intentions";
import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<"receiptTransferIntentions.remove"> =
	{
		onMutate:
			(controllerContext) =>
			({ receiptId }) =>
				mergeUpdaterResults(
					updateRevertReceipts(controllerContext, {
						get: (controller) =>
							controller.update(
								receiptId,
								(receipt) => ({
									...receipt,
									transferIntentionUserId: undefined,
								}),
								(snapshot) => (receipt) => ({
									...receipt,
									transferIntentionUserId: snapshot.transferIntentionUserId,
								}),
							),
						getPaged: undefined,
					}),
					updateRevertReceiptTransferIntentions(controllerContext, {
						getAll: (controller) =>
							mergeUpdaterResults(
								controller.outbound.remove(receiptId),
								controller.inbound.remove(receiptId),
							),
					}),
				),
		errorToastOptions: () => (error) => ({
			text: `Error removing receipt transfer intention: ${error.message}`,
		}),
	};
