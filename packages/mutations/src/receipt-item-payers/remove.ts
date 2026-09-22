import type { ReceiptId } from "~db/ids";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getPayersItems } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItemPayers.remove",
	{ receiptId: ReceiptId }
> = {
	mutationKey: "receiptItemPayers.remove",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.removePayer(receiptId, variables.peerId),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.removeItemPayer(
						receiptId,
						variables.itemId,
						variables.peerId,
					),
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.removeItemPayer.error", {
				ns: "receipts",
				items: getPayersItems(
					t,
					variablesSet.map(({ itemId }) => itemId),
				),
				errors,
			}),
		}),
};
