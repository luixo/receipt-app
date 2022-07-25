import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"item-participants.delete",
	ReturnType<typeof cache["receiptItems"]["get"]["receiptItemPart"]["remove"]>,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) =>
		cache.receiptItems.get.receiptItemPart.remove(
			trpcContext,
			input,
			variables.itemId,
			(part) => part.userId !== variables.userId
		),
	onError: (trpcContext, input) => (_error, variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.receiptItems.get.receiptItemPart.add(
			trpcContext,
			input,
			variables.itemId,
			snapshot.receiptItemPart,
			snapshot.index
		);
	},
};
