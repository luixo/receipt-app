import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const mutationOptions: UseContextedMutationOptions<"accountConnectionIntentions.reject"> =
	{
		onSuccess: (trpcContext) => (_result, variables) => {
			cache.accountConnections.getAll.inbound.remove(
				trpcContext,
				variables.sourceAccountId
			);
		},
	};
