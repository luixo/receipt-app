import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptItemsId, ReceiptsId } from "next-app/db/models";

import { updateReceiptSum } from "./utils";

export const options: UseContextedMutationOptions<
	"receiptItems.add",
	ReceiptItemsId,
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) => {
		const temporaryId = v4();
		cache.receiptItems.get.receiptItem.add(trpcContext, receiptId, {
			id: temporaryId,
			name: variables.name,
			price: variables.price,
			quantity: variables.quantity,
			locked: false,
			parts: [],
		});
		return temporaryId;
	},
	onError: (trpcContext, receiptId) => (_error, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		cache.receiptItems.get.receiptItem.remove(
			trpcContext,
			receiptId,
			temporaryId
		);
	},
	onSuccess:
		(trpcContext, receiptId) => (actualId, _variables, temporaryId) => {
			cache.receiptItems.get.receiptItem.update(
				trpcContext,
				receiptId,
				temporaryId!,
				(item) => ({ ...item, id: actualId })
			);
			updateReceiptSum(trpcContext, receiptId);
		},
};
