import { v4 } from "uuid";

import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { updateReceiptSum } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	ReceiptsId,
	ReceiptItemsId
> = {
	onMutate: (controllerContext, receiptId) => (variables) => {
		const temporaryId = v4();
		return {
			...cache.receiptItems.updateRevert(controllerContext, {
				getReceiptItem: (controller) =>
					controller.add(receiptId, {
						id: temporaryId,
						name: variables.name,
						price: variables.price,
						quantity: variables.quantity,
						locked: false,
						parts: [],
					}),
				getReceiptParticipant: undefined,
				getReceiptItemPart: undefined,
			}),
			context: temporaryId,
		};
	},
	onSuccess:
		(controllerContext, receiptId) => (id, _variables, temporaryId) => {
			cache.receiptItems.update(controllerContext, {
				getReceiptItem: (controller) =>
					controller.update(receiptId, temporaryId!, (item) => ({
						...item,
						id,
					})),
				getReceiptParticipant: undefined,
				getReceiptItemPart: undefined,
			});
			updateReceiptSum(controllerContext, receiptId);
		},
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding item "${variables.name}": ${error.message}`,
	}),
};
