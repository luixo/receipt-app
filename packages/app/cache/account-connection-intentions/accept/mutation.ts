import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<
	"account-connection-intentions.accept",
	ReturnType<typeof cache["users"]["getNotConnected"]["remove"]> | undefined
> = {
	onMutate: (trpcContext) => (variables) =>
		cache.users.getNotConnected.remove(trpcContext, variables.userId),
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.users.getNotConnected.add(trpcContext, snapshot);
	},
	onSuccess: (trpcContext) => (email, variables) => {
		cache.accountConnections.getAll.inbound.remove(
			trpcContext,
			variables.accountId
		);
		cache.users.get.update(trpcContext, variables.userId, (user) => ({
			...user,
			email,
		}));
		cache.users.getPaged.update(trpcContext, variables.userId, (user) => ({
			...user,
			email,
		}));
	},
};
