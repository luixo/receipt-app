import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"itemParticipants.remove",
	ReturnType<typeof cache["receiptItems"]["get"]["receiptItemPart"]["remove"]>,
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) =>
		cache.receiptItems.get.receiptItemPart.remove(
			trpcContext,
			receiptId,
			variables.itemId,
			variables.userId
		),
	onError: (trpcContext, receiptId) => (_error, variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.receiptItems.get.receiptItemPart.add(
			trpcContext,
			receiptId,
			variables.itemId,
			snapshot.receiptItemPart,
			snapshot.index
		);
	},
};
