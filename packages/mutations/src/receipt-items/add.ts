import type { ReceiptItemsId } from "~db/models";
import { getNow } from "~utils/date";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	undefined,
	ReceiptItemsId
> = {
	mutationKey: "receiptItems.add",
	onMutate: (controllerContext) => async (variables) => {
		const temporaryId = `temp-${Math.random()}`;
		const revertResult = await updateRevertReceipts(controllerContext, {
			get: (controller) =>
				controller.addItem(variables.receiptId, {
					id: temporaryId,
					name: variables.name,
					price: variables.price,
					quantity: variables.quantity,
					createdAt: getNow.zonedDateTime(),
					consumers: [],
				}),
			getPaged: undefined,
		});
		return {
			...revertResult,
			context: temporaryId,
		};
	},
	onSuccess:
		(controllerContext) =>
		({ id, createdAt }, variables, temporaryId) => {
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItem(variables.receiptId, temporaryId, (item) => ({
						...item,
						id,
						createdAt,
					})),
				getPaged: undefined,
			});
		},
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.addItem.error", {
				ns: "receipts",
				itemsCount: variablesSet.length,
				items: variablesSet.map((variables) => `"${variables.name}"`),
				errors,
			}),
		}),
};
