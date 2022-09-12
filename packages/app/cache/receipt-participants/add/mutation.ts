import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receiptParticipants.add",
	void,
	{ receiptId: ReceiptsId }
> = {
	onSuccess:
		(trpcContext, { receiptId }) =>
		(result) => {
			result.forEach((resultItem) => {
				cache.receiptItems.get.receiptParticipant.add(trpcContext, receiptId, {
					name: resultItem.name,
					publicName: resultItem.publicName,
					accountId: resultItem.accountId,
					email: resultItem.email,
					remoteUserId: resultItem.id,
					localUserId: resultItem.id,
					role: resultItem.role,
					resolved: false,
					added: resultItem.added,
				});
			});
			const selfParticipating = result.find(
				(resultItem) => resultItem.role === "owner"
			);
			if (selfParticipating) {
				cache.receipts.getPaged.update(trpcContext, receiptId, (item) => ({
					...item,
					participantResolved: false,
				}));
				cache.receipts.get.update(trpcContext, receiptId, (item) => ({
					...item,
					participantResolved: false,
				}));
			}
			cache.users.suggest.invalidate(trpcContext);
			cache.debts.getReceipt.invalidate(trpcContext, receiptId);
		},
};
