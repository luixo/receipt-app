import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"item-participants.put",
	void,
	Cache.ReceiptItems.Get.Input
> = {
	onMutate: (trpcContext, input) => (variables) => {
		cache.receiptItems.get.receiptItemPart.add(
			trpcContext,
			input,
			variables.itemId,
			{ userId: variables.userId, dirty: true, part: 1 }
		);
	},
	onSuccess: (trpcContext, input) => (_value, variables) => {
		cache.receiptItems.get.receiptItemPart.update(
			trpcContext,
			input,
			variables.itemId,
			variables.userId,
			(part) => ({ ...part, dirty: false })
		);
	},
	onError: (trpcContext, input) => (_error, variables) => {
		cache.receiptItems.get.receiptItemPart.remove(
			trpcContext,
			input,
			variables.itemId,
			(part) => variables.userId === part.userId
		);
	},
};
