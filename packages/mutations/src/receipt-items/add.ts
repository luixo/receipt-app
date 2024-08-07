import type { ReceiptItemsId, ReceiptsId } from "~db";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	ReceiptsId,
	ReceiptItemsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) => {
		const temporaryId = `temp-${Math.random()}`;
		return {
			...cache.receipts.updateRevert(controllerContext, {
				get: (controller) =>
					controller.addItem(receiptId, {
						id: temporaryId,
						name: variables.name,
						price: variables.price,
						quantity: variables.quantity,
						locked: false,
						created: new Date(),
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
		({ id, created }, _variables, temporaryId) => {
			cache.receipts.update(controllerContext, {
				get: (controller) =>
					controller.updateItem(receiptId, temporaryId, (item) => ({
						...item,
						id,
						created,
					})),
				getPaged: undefined,
				getNonResolvedAmount: undefined,
			});
		},
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding item "${variables.name}": ${error.message}`,
	}),
};
