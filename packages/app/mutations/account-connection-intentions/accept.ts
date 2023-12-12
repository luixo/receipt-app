import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			cache.users.update(controllerContext, {
				get: (controller) => {
					controller.update(variables.userId, (user) => ({ ...user, account }));
				},
				getPaged: (controller) => {
					controller.update(variables.userId, (user) => ({ ...user, account }));
				},
				getName: undefined,
			});
			void cache.users.invalidateSuggest(controllerContext);
		},
		errorToastOptions: () => (error) => ({
			text: `Error accepting an invite: ${error.message}`,
		}),
	};
