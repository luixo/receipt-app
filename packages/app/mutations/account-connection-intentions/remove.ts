import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.remove"> =
	{
		onMutate: (trpcContext) => (variables) => ({
			revertFns: cache.accountConnections.updateRevert(trpcContext, {
				getAll: (controller) =>
					controller.outbound.remove(variables.targetAccountId),
			}),
		}),
		errorToastOptions: () => (error) => ({
			text: `Error removing the invite: ${error.message}`,
		}),
	};
