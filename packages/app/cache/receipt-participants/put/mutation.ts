import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId } from "next-app/db/models";

export type SelectedUser = {
	name: string;
	publicName: string | null;
	connectedAccountId: AccountsId | null;
};

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.put",
	ReturnType<typeof cache["users"]["getAvailable"]["remove"]>,
	{
		itemsInput: Cache.ReceiptItems.Get.Input;
		usersInput: Cache.Users.GetAvailable.Input;
		user: SelectedUser;
	}
> = {
	onMutate:
		(trpcContext, { usersInput }) =>
		(variables) =>
			cache.users.getAvailable.remove(
				trpcContext,
				usersInput,
				(user) => user.id === variables.userId
			),
	onSuccess:
		(trpcContext, { itemsInput, user }) =>
		({ added }, variables) => {
			cache.receiptItems.get.receiptParticipant.add(trpcContext, itemsInput, {
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
		(trpcContext, { usersInput }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.users.getAvailable.add(trpcContext, usersInput, snapshot);
		},
};
