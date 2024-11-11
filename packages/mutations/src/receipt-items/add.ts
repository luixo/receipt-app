import type { ReceiptItemsId } from "~db/models";

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
	onMutate: (controllerContext) => (variables) => {
		const temporaryId = `temp-${Math.random()}`;
		return {
			...updateRevertReceipts(controllerContext, {
				get: (controller) =>
					controller.addItem(variables.receiptId, {
						id: temporaryId,
						name: variables.name,
						price: variables.price,
						quantity: variables.quantity,
						createdAt: new Date(),
						parts: [],
					}),
				getPaged: undefined,
			}),
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
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding item "${variables.name}": ${error.message}`,
	}),
};
