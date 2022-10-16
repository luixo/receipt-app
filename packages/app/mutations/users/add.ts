import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.add"> = {
	onSuccess:
		(trpcContext) =>
		({ id, connection }, variables) => {
			cache.users.update(trpcContext, {
				get: (controller) =>
					controller.add({
						remoteId: id,
						localId: id,
						name: variables.name,
						publicName: null,
						email: null,
						accountId: null,
					}),
				getPaged: (controller) =>
					controller.add({
						id,
						name: variables.name,
						publicName: null,
						email: null,
					}),
				getName: (controller) => controller.upsert(id, variables.name),
			});
			cache.users.invalidateSuggest(trpcContext);
			if (connection && !connection.connected) {
				cache.accountConnections.update(trpcContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: connection.id,
								email: variables.email!,
							},
							user: {
								id,
								name: variables.name,
							},
						}),
				});
			}
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
