import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onMutate: (trpcContext) => (variables) =>
			cache.accountConnections.updateRevert(trpcContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (trpcContext) => (email, variables) => {
			cache.users.update(trpcContext, {
				get: (controller) => {
					controller.update(variables.userId, (user) => ({
						...user,
						email,
						accountId: variables.accountId,
					}));
				},
				getPaged: (controller) => {
					controller.update(variables.userId, (user) => ({ ...user, email }));
				},
				getName: noop,
			});
			cache.users.invalidateSuggest(trpcContext);
		},
		errorToastOptions: () => (error) => ({
			text: `Error accepting an invite: ${error.message}`,
		}),
	};
