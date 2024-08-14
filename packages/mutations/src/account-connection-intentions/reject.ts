import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.reject"> =
	{
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) =>
					controller.inbound.remove(variables.sourceAccountId),
			}),
		errorToastOptions: () => (error) => ({
			text: `Error rejecting an invite: ${error.message}`,
		}),
	};
