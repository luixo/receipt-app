import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof cache["users"]["getAvailable"]["remove"]>[],
	ReceiptsId
> = {
	onMutate: (trpcContext, receiptId) => (variables) =>
		variables.userIds.map((userId) =>
			cache.users.getAvailable.remove(trpcContext, receiptId, userId)
		),
	onSuccess:
		(trpcContext, receiptId) =>
		({ added }, variables, snapshot) => {
			if (snapshot) {
				variables.userIds.forEach((userId, index) => {
					const snapshotUser = snapshot[index];
					const addedTimestamp = added[index];
					if (!snapshotUser || !addedTimestamp) {
						return;
					}
					cache.receiptItems.get.receiptParticipant.add(
						trpcContext,
						receiptId,
						{
							name: snapshotUser.name,
							connectedAccountId: snapshotUser.connectedAccountId,
							remoteUserId: userId,
							localUserId: userId,
							role: variables.role,
							resolved: false,
							added: addedTimestamp,
						}
					);
				});
			}
		},
	onError: (trpcContext, receiptId) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		snapshot.forEach((snapshotUser) =>
			cache.users.getAvailable.add(trpcContext, receiptId, snapshotUser!)
		);
	},
};
