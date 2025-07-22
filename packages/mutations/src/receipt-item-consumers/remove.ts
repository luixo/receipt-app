import type { ReceiptsId } from "~db/models";

import { updateRevert as updateRevertReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getConsumersItems } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.remove",
	{ receiptId: ReceiptsId }
> = {
	mutationKey: "receiptItemConsumers.remove",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.removePayer(receiptId, variables.userId),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.removeItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
					),
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ t }, contexts) =>
		(errors, variablesSet) => ({
			text: t("toasts.removeConsumer.error", {
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
