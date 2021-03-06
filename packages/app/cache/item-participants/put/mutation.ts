import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"item-participants.put",
	void,
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) => {
		cache.receiptItems.get.receiptItemPart.add(
			trpcContext,
			receiptId,
			variables.itemId,
			{ userId: variables.userId, part: 1 }
		);
	},
	onError: (trpcContext, receiptId) => (_error, variables) => {
		cache.receiptItems.get.receiptItemPart.remove(
			trpcContext,
			receiptId,
			variables.itemId,
			variables.userId
		);
	},
};
