import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { updateReceiptSum } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	ReceiptsId,
	ReceiptItemsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) => {
		const temporaryId = v4();
		return {
			revertFns: cache.receiptItems.updateRevert(trpcContext, {
				getReceiptItem: (controller) =>
					controller.add(receiptId, {
						id: temporaryId,
						name: variables.name,
						price: variables.price,
						quantity: variables.quantity,
						locked: false,
						parts: [],
					}),
				getReceiptParticipant: noop,
				getReceiptItemPart: noop,
			}),
			context: temporaryId,
		};
	},
	onSuccess: (trpcContext, receiptId) => (id, _variables, temporaryId) => {
		cache.receiptItems.update(trpcContext, {
			getReceiptItem: (controller) =>
				controller.update(receiptId, temporaryId!, (item) => ({ ...item, id })),
			getReceiptParticipant: noop,
			getReceiptItemPart: noop,
		});
		updateReceiptSum(trpcContext, receiptId);
	},
};
