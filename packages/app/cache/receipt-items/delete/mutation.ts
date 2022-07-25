import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { updateReceiptSum } from "app/utils/receipt";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-items.delete",
	ReturnType<typeof cache["receiptItems"]["get"]["receiptItem"]["remove"]>,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate:
		(trpcContext, input) =>
		({ id: removedId }) =>
			cache.receiptItems.get.receiptItem.remove(
				trpcContext,
				input,
				(item) => item.id === removedId
			),
	onError: (trpcContext, input) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.receiptItems.get.receiptItem.add(
			trpcContext,
			input,
			snapshot.receiptItem,
			snapshot.index
		);
	},
	onSuccess: (trpcContext, input) => () => {
		updateReceiptSum(trpcContext, input);
	},
};
