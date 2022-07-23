import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const rejectMutationOptions: UseContextedMutationOptions<"account-connection-intentions.reject"> =
	{
		onSuccess: (trpcContext) => (_result, variables) => {
			cache.accountConnections.getAll.inbound.remove(
				trpcContext,
				(intention) => intention.accountId === variables.sourceAccountId
			);
		},
	};
