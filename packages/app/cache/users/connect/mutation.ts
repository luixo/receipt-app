import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.add",
	AccountsId
> = {
	onSuccess:
		(trpcContext) =>
		({ id: accountId, userName, connected }, variables) => {
			if (connected) {
				cache.users.get.update(trpcContext, variables.userId, (user) => ({
					...user,
					email: variables.email,
				}));
				cache.users.getPaged.update(trpcContext, variables.userId, (user) => ({
					...user,
					email: variables.email,
				}));
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
