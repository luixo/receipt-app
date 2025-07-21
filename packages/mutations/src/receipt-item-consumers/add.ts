import type { ReceiptsId } from "~db/models";
import { mergeErrors } from "~mutations/utils";
import { getNow } from "~utils/date";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

import { getConsumersText } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItemConsumers.add",
	{ receiptId: ReceiptsId }
> = {
	mutationKey: "receiptItemConsumers.add",
	onMutate:
		(controllerContext, { receiptId }) =>
		(variables) => {
			if (variables.itemId === receiptId) {
				return updateRevertReceipts(controllerContext, {
					get: (controller) =>
						controller.addPayer(receiptId, {
							userId: variables.userId,
							part: variables.part,
							createdAt: getNow.zonedDateTime(),
						}),
					getPaged: undefined,
				});
			}
			return updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						variables.part,
						getNow.zonedDateTime(),
					),
				getPaged: undefined,
			});
		},
	onSuccess:
		(controllerContext, { receiptId }) =>
		(result, variables) => {
			if (variables.itemId === receiptId) {
				return updateReceipts(controllerContext, {
					get: (controller) =>
						controller.updatePayer(receiptId, variables.userId, (payer) => ({
							...payer,
							createdAt: result.createdAt,
						})),
					getPaged: undefined,
				});
			}
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItemConsumer(
						receiptId,
						variables.itemId,
						variables.userId,
						(consumer) => ({ ...consumer, createdAt: result.createdAt }),
					),
				getPaged: undefined,
			});
		},
	errorToastOptions: (contexts) => (errors, variablesSet) => {
		const texts = getConsumersText(
			variablesSet.map(({ itemId }) => itemId),
			contexts.map((context) => context.receiptId),
		);
		return {
			text: `Error adding ${texts}: ${mergeErrors(errors)}`,
		};
	},
};
