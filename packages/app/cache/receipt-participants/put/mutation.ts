import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof cache["users"]["getAvailable"]["remove"]>,
	{
		receiptId: ReceiptsId;
		user: Parameters<typeof cache["users"]["getAvailable"]["add"]>[2];
	}
> = {
	onMutate:
		(trpcContext, { receiptId }) =>
		(variables) =>
			cache.users.getAvailable.remove(trpcContext, receiptId, variables.userId),
	onSuccess:
		(trpcContext, { receiptId, user }) =>
		({ added }, variables) => {
			cache.receiptItems.get.receiptParticipant.add(trpcContext, receiptId, {
				name: user.name,
				publicName: user.publicName,
				connectedAccountId: user.connectedAccountId,
				userId: variables.userId,
				localUserId: variables.userId,
				role: variables.role,
				resolved: false,
				added,
			});
		},
	onError:
		(trpcContext, { receiptId }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.users.getAvailable.add(trpcContext, receiptId, snapshot);
		},
};
