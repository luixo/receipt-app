import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				cache.users.update(controllerContext, {
					get: (controller) => {
						controller.update(variables.userId, (user) => ({
							...user,
							email: variables.email,
							accountId: result.id,
						}));
					},
					getName: (controller) =>
						controller.upsert(variables.userId, result.user.name),
					getPaged: (controller) => {
						controller.update(variables.userId, (user) => ({
							...user,
							email: variables.email,
						}));
					},
				});
			} else {
				cache.accountConnections.update(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: result.id,
								email: variables.email,
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
