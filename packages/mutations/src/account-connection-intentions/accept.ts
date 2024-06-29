import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

import { updateUserConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			updateUserConnected(controllerContext, variables.userId, account);
		},
		errorToastOptions: () => (error) => ({
			text: `Error accepting an invite: ${error.message}`,
		}),
	};
