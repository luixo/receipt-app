import type { ReceiptId } from "~db/ids";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.remove",
	{ receiptId: ReceiptId }
> = {
	mutationKey: "receiptItems.remove",
	onMutate:
		(controllerContext, { receiptId }) =>
		({ id: removedId }) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) => controller.removeItem(receiptId, removedId),
				getPaged: undefined,
			}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.removeItem.error", {
				ns: "receipts",
				itemsCount: errors.length,
				errors,
			}),
		}),
};
