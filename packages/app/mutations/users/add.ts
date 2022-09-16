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
							accountId: connection.id,
							email: variables.email!,
							userId: id,
							userName: variables.name,
						}),
				});
			}
		},
};
