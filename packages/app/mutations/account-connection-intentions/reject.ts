import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.reject"> =
	{
		onMutate: (trpcContext) => (variables) => ({
			revertFns: cache.accountConnections.updateRevert(trpcContext, {
				getAll: (controller) =>
					controller.inbound.remove(variables.sourceAccountId),
			}),
		}),
	};
