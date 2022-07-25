import { v4 } from "uuid";

import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { updateReceiptSum } from "app/utils/receipt";
import { ReceiptItemsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-items.put",
	ReceiptItemsId,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		const temporaryId = v4();
		cache.receiptItems.get.receiptItem.add(trpcContext, input, {
			id: temporaryId,
			name: variables.name,
			price: variables.price,
			quantity: variables.quantity,
			locked: false,
			parts: [],
			dirty: true,
		});
		return temporaryId;
	},
	onError: (trpcContext, input) => (_error, _variables, temporaryId) => {
		cache.receiptItems.get.receiptItem.remove(
			trpcContext,
			input,
			(item) => item.id === temporaryId
		);
	},
	onSuccess: (trpcContext, input) => (actualId, _variables, temporaryId) => {
		cache.receiptItems.get.receiptItem.update(
			trpcContext,
			input,
			temporaryId,
			(item) => ({
				...item,
				id: actualId,
				dirty: false,
			})
		);
		updateReceiptSum(trpcContext, input);
	},
};
