import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.accept",
	ReturnType<typeof cache["users"]["getNotConnected"]["remove"]> | undefined,
	{
		usersInput: Cache.Users.GetPaged.Input;
		usersNotConnectedInput: Cache.Users.GetNotConnected.Input;
		userInput: Cache.Users.Get.Input;
	}
> = {
	onMutate:
		(trpcContext, { usersNotConnectedInput }) =>
		(variables) =>
			cache.users.getNotConnected.remove(
				trpcContext,
				usersNotConnectedInput,
				(user) => user.id === variables.userId
			),
	onError:
		(trpcContext, { usersNotConnectedInput }) =>
		(_error, _variables, snapshot) => {
			if (!snapshot) {
				return;
			}
			cache.users.getNotConnected.add(
				trpcContext,
				usersNotConnectedInput,
				snapshot
			);
		},
	onSuccess:
		(trpcContext, { userInput, usersInput }) =>
		(email, variables) => {
			cache.accountConnections.getAll.inbound.remove(
				trpcContext,
				(intention) => intention.accountId === variables.accountId
			);
			cache.users.get.update(trpcContext, userInput, (user) => ({
				...user,
				email,
			}));
			cache.users.getPaged.update(
				trpcContext,
				usersInput,
				variables.userId,
				(user) => ({ ...user, email })
			);
		},
};
