import type { ReceiptId } from "~db/ids";
import { getNow } from "~utils/date";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getPayersItems } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItemPayers.add",
	{ receiptId: ReceiptId }
> = {
	mutationKey: "receiptItemPayers.add",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) =>
			updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItemPayer(
						receiptId,
						variables.itemId,
						variables.userId,
						variables.part,
						getNow.zonedDateTime(),
					),
				getPaged: undefined,
			}),
	onSuccess:
		(controllerContext, { receiptId }) =>
		(result, variables) => {
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemPayer(
						receiptId,
						variables.itemId,
						variables.userId,
						(payer) => ({ ...payer, createdAt: result.createdAt }),
					),
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.addItemPayer.error", {
				ns: "receipts",
				items: getPayersItems(
					t,
					variablesSet.map(({ itemId }) => itemId),
				),
				errors,
			}),
		}),
};
