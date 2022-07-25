import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"receipt-participants.delete",
	ReturnType<
		typeof cache["receiptItems"]["get"]["receiptParticipant"]["remove"]
	>,
	{
		itemsInput: Cache.ReceiptItems.Get.Input;
		usersInput: Cache.Users.GetAvailable.Input;
		user: Cache.Users.GetAvailable.User;
	}
> = {
	onMutate:
		(trpcContext, { itemsInput }) =>
		({ userId }) =>
			cache.receiptItems.get.receiptParticipant.remove(
				trpcContext,
				itemsInput,
				(participant) => participant.userId === userId
			),
	onError:
		(trpcContext, { itemsInput, usersInput, user }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.receiptItems.get.receiptParticipant.add(
				trpcContext,
				itemsInput,
				snapshot.receiptParticipant,
				snapshot.index
			);
			cache.users.getAvailable.add(trpcContext, usersInput, user);
		},
};
