import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.remove"> =
	{
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) =>
					controller.outbound.remove(variables.targetAccountId),
			}),
		errorToastOptions: () => (error) => ({
			text: `Error removing the invite: ${error.message}`,
		}),
	};
