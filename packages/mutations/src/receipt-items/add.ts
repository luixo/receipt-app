import type { ReceiptItemsId, ReceiptsId } from "~db/models";

import {
	update as updateReceipts,
	updateRevert as updateRevertReceipts,
} from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	ReceiptsId,
	ReceiptItemsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) => {
		const temporaryId = `temp-${Math.random()}`;
		return {
			...updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItem(receiptId, {
						id: temporaryId,
						name: variables.name,
						price: variables.price,
						quantity: variables.quantity,
						createdAt: new Date(),
						parts: [],
					}),
				getPaged: undefined,
				getNonResolvedAmount: undefined,
			}),
			context: temporaryId,
		};
	},
	onSuccess:
		(controllerContext, receiptId) =>
		({ id, createdAt }, _variables, temporaryId) => {
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateItem(receiptId, temporaryId, (item) => ({
						...item,
						id,
						createdAt,
					})),
				getPaged: undefined,
				getNonResolvedAmount: undefined,
			});
		},
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding item "${variables.name}": ${error.message}`,
	}),
};
