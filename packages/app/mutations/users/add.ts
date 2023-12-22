import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.add"> = {
	onSuccess:
		(controllerContext) =>
		({ id, connection }, variables) => {
			cache.users.update(controllerContext, {
				get: (controller) =>
					controller.add({
						remoteId: id,
						localId: id,
						name: variables.name,
						publicName: undefined,
						connectedAccount: undefined,
					}),
				getPaged: (controller) =>
					controller.add({
						id,
						name: variables.name,
						publicName: undefined,
						connectedAccount: undefined,
					}),
				getName: (controller) => controller.upsert(id, variables.name),
			});
			if (connection && !connection.connected) {
				cache.accountConnections.update(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: connection.account.id,
								email: connection.account.email,
							},
							user: {
								id,
								name: variables.name,
							},
						}),
				});
			}
			void cache.users.invalidateSuggest(controllerContext);
		},
	mutateToastOptions: () => (variables) => ({
		text: `Adding user "${variables.name}"..`,
	}),
	successToastOptions: () => (_result, variables) => ({
		text: `User "${variables.name}" added`,
	}),
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding user "${variables.name}": ${error.message}`,
	}),
};
