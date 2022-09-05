import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.add",
	void,
	{ receiptId: ReceiptsId }
> = {
	onSuccess:
		(trpcContext, { receiptId }) =>
		(result) => {
			result.forEach((resultItem) => {
				cache.receiptItems.get.receiptParticipant.add(trpcContext, receiptId, {
					name: resultItem.name,
					connectedAccountId: resultItem.connectedAccountId,
					remoteUserId: resultItem.id,
					localUserId: resultItem.id,
					role: resultItem.role,
					resolved: false,
					added: resultItem.added,
				});
			});
			cache.users.suggest.invalidate(trpcContext);
			cache.debts.getReceipt.invalidate(trpcContext, receiptId);
		},
};
