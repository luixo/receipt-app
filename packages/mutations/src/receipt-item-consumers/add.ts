import type { ReceiptId } from "~db/ids";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getConsumersItems } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.add",
	{ receiptId: ReceiptId }
> = {
	mutationKey: "receiptItemConsumers.add",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.addPayer(receiptId, {
							peerId: variables.peerId,
							part: variables.part,
							createdAt: Temporal.Now.zonedDateTimeISO(),
						}),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItemConsumer(
						receiptId,
						variables.itemId,
						variables.peerId,
						variables.part,
						Temporal.Now.zonedDateTimeISO(),
					),
				getPaged: undefined,
			});
		},
	onSuccess:
		(controllerContext, { receiptId }) =>
		(result, variables) => {
			if (variables.itemId === receiptId) {
				return updateReceipts(controllerContext, {
					get: (controller) => {
						controller.updatePayer(receiptId, variables.peerId, (payer) => ({
							...payer,
							createdAt: result.createdAt,
						}));
					},
					getPaged: undefined,
				});
			}
			updateReceipts(controllerContext, {
				get: (controller) => {
					controller.updateItemConsumer(
						receiptId,
						variables.itemId,
						variables.peerId,
						(consumer) => ({ ...consumer, createdAt: result.createdAt }),
					);
				},
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ t }, contexts) =>
		(errors, variablesSet) => ({
			text: t("toasts.addConsumer.error", {
				ns: "receipts",
				items: getConsumersItems(
					t,
					variablesSet.map(({ itemId }) => itemId),
					contexts.map((context) => context.receiptId),
				),
				errors,
			}),
		}),
};
