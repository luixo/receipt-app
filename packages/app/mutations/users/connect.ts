import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		onSuccess:
			(trpcContext) =>
			({ id: accountId, userName, connected }, variables) => {
				if (connected) {
					cache.users.update(trpcContext, {
						get: (controller) => {
							controller.update(variables.userId, (user) => ({
								...user,
								email: variables.email,
								accountId,
							}));
						},
						getName: (controller) =>
							controller.upsert(variables.userId, userName),
						getPaged: (controller) => {
							controller.update(variables.userId, (user) => ({
								...user,
								email: variables.email,
							}));
						},
					});
				} else {
					cache.accountConnections.update(trpcContext, {
						getAll: (controller) =>
							controller.outbound.add({
								accountId,
								email: variables.email,
								userId: variables.userId,
								userName,
							}),
					});
				}
			},
	};
