import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onSuccess: (trpcContext) => (email, variables) => {
			cache.users.suggest.invalidate(trpcContext);
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
