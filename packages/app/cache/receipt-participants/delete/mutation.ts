import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<
		typeof cache["receiptItems"]["get"]["receiptParticipant"]["remove"]
	>,
	{ receiptId: ReceiptsId }
> = {
	onMutate:
		(trpcContext, { receiptId }) =>
		({ userId }) =>
			cache.receiptItems.get.receiptParticipant.remove(
				trpcContext,
				receiptId,
				userId
			),
	onSuccess:
		(trpcContext, { receiptId }) =>
		(_result, { userId }) => {
			cache.debts.getReceipt.remove(trpcContext, receiptId, userId);
			cache.users.suggest.invalidate(trpcContext);
		},
	onError:
		(trpcContext, { receiptId }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.receiptItems.get.receiptParticipant.add(
				trpcContext,
				receiptId,
				snapshot.receiptParticipant,
				snapshot.index
			);
		},
};
