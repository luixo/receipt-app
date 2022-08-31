import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, ReceiptsId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof cache["users"]["getAvailable"]["remove"]>[],
	{ receiptId: ReceiptsId; selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { receiptId }) =>
		(variables) =>
			variables.userIds.map((userId) =>
				cache.users.getAvailable.remove(trpcContext, receiptId, userId)
			),
	onSuccess:
		(trpcContext, { receiptId, selfAccountId }) =>
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
							role: userId === selfAccountId ? "owner" : variables.role,
							resolved: false,
							added: addedTimestamp,
						}
					);
				});
			}
			cache.debts.getReceipt.invalidate(trpcContext, receiptId);
		},
	onError:
		(trpcContext, { receiptId }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			snapshot.forEach((snapshotUser) =>
				cache.users.getAvailable.add(trpcContext, receiptId, snapshotUser!)
			);
		},
};
