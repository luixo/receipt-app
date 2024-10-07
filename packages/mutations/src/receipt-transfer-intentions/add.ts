import type { CurrencyCode } from "~app/utils/currency";
import type { UsersId } from "~db/models";

import { updateRevert as updateRevertReceiptTransferIntentions } from "../cache/receipt-transfer-intentions";
import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

export const options: UseContextedMutationOptions<
	"receiptTransferIntentions.add",
	{
		receipt: {
			name: string;
			issued: Date;
			sum: number;
			currencyCode: CurrencyCode;
		};
		targetUserId: UsersId;
	}
> = {
	onMutate:
		(controllerContext, { receipt: receiptContext, targetUserId }) =>
		({ receiptId }) =>
			mergeUpdaterResults(
				updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.update(
							receiptId,
							(receipt) => ({
								...receipt,
								transferIntentionUserId: targetUserId,
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
						controller.outbound.add({
							receipt: {
								id: receiptId,
								name: receiptContext.name,
								issued: receiptContext.issued,
								sum: receiptContext.sum,
								currencyCode: receiptContext.currencyCode,
							},
							userId: targetUserId,
						}),
				}),
			),
	successToastOptions: () => (_result, variables) => ({
		text: `Receipt transfer intention was sent to "${variables.targetEmail}"`,
	}),
	errorToastOptions: () => (error) => ({
		text: `Error transferring receipt: ${error.message}`,
	}),
};
