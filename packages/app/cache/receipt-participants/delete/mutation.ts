import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<
		typeof cache["receiptItems"]["get"]["receiptParticipant"]["remove"]
	>,
	{
		receiptId: ReceiptsId;
		user: Parameters<typeof cache["users"]["getAvailable"]["add"]>[2];
	}
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
		(trpcContext, { receiptId, user }) =>
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
			cache.users.getAvailable.add(trpcContext, receiptId, user);
		},
};
