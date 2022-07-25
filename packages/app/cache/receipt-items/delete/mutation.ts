import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-items.delete",
	ReturnType<typeof cache["receiptItems"]["get"]["receiptItem"]["remove"]>,
	ReceiptsId
> = {
	onMutate:
		(trpcContext, receiptId) =>
		({ id: removedId }) =>
			cache.receiptItems.get.receiptItem.remove(
				trpcContext,
				receiptId,
				removedId
			),
	onError: (trpcContext, receiptId) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.receiptItems.get.receiptItem.add(
			trpcContext,
			receiptId,
			snapshot.receiptItem,
			snapshot.index
		);
	},
	onSuccess: (trpcContext, receiptId) => () => {
		cache.receipts.utils.updateReceiptSum(trpcContext, receiptId);
	},
};
