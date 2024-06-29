import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

import { updateUserConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				updateUserConnected(
					controllerContext,
					variables.userId,
					result.account,
				);
			} else {
				cache.accountConnections.update(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: result.account.id,
								email: result.account.email,
							},
							user: {
								id: variables.userId,
								name: result.user.name,
							},
						}),
				});
			}
		},
		mutateToastOptions: () => (variables) => ({
			text: `Sending connection intention to "${variables.email}"..`,
		}),
		successToastOptions: () => (_result, variables) => ({
			text: `Connection intention to "${variables.email}" sent`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error sending connection intention: ${error.message}`,
		}),
	};
