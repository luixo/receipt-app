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
			// It's too complicated to pass all the data needed
			// to properly place a "users.get-available" user inside the list
			cache.users.getAvailable.invalidate(trpcContext, receiptId);
		},
};
