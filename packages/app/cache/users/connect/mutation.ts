import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.put",
	AccountsId,
	{ pagedInput: Cache.Users.GetPaged.Input; input: Cache.Users.Get.Input }
> = {
	onSuccess:
		(trpcContext, { input, pagedInput }) =>
		({ id: accountId, userName, connected }, variables) => {
			if (connected) {
				cache.users.get.update(trpcContext, input, (user) => ({
					...user,
					email: variables.email,
				}));
				cache.users.getPaged.update(
					trpcContext,
					pagedInput,
					variables.userId,
					(user) => ({
						...user,
						email: variables.email,
					})
				);
			} else {
				cache.accountConnections.getAll.outbound.add(trpcContext, {
					accountId,
					email: variables.email,
					userId: variables.userId,
					userName,
				});
			}
		},
};
