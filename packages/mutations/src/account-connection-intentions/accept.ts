import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			cache.users.update(controllerContext, {
				get: (controller) =>
					controller.update(variables.userId, (user) => ({
						...user,
						connectedAccount: account,
					})),
				getForeign: (controller) => {
					controller.updateOwn(variables.userId, (user) => ({
						...user,
						connectedAccount: account,
					}));
					controller.invalidateForeign();
				},
				getPaged: undefined,
			});
			void cache.users.invalidateSuggest(controllerContext);
		},
		errorToastOptions: () => (error) => ({
			text: `Error accepting an invite: ${error.message}`,
		}),
	};
