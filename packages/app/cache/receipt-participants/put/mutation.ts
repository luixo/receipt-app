import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof cache["users"]["getAvailable"]["remove"]>,
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) =>
		cache.users.getAvailable.remove(trpcContext, receiptId, variables.userId),
	onSuccess:
		(trpcContext, receiptId) =>
		({ added }, variables, snapshot) => {
			if (snapshot) {
				cache.receiptItems.get.receiptParticipant.add(trpcContext, receiptId, {
					name: snapshot.name,
					connectedAccountId: snapshot.connectedAccountId,
					userId: variables.userId,
					localUserId: variables.userId,
					role: variables.role,
					resolved: false,
					added,
				});
			}
		},
	onError: (trpcContext, receiptId) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.users.getAvailable.add(trpcContext, receiptId, snapshot);
	},
};
