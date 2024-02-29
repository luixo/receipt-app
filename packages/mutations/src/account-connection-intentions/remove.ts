import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.remove"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) =>
					controller.outbound.remove(variables.targetAccountId),
			}),
		errorToastOptions: () => (error) => ({
			text: `Error removing the invite: ${error.message}`,
		}),
	};
