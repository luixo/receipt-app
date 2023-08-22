import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.reject"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) =>
					controller.inbound.remove(variables.sourceAccountId),
			}),
		errorToastOptions: () => (error) => ({
			text: `Error rejecting an invite: ${error.message}`,
		}),
	};
