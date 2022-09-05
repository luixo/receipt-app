import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"users.add",
	UsersId
> = {
	onMutate: (trpcContext) => (form) => {
		const temporaryId = v4();
		cache.users.getPaged.add(trpcContext, {
			id: temporaryId,
			name: form.name,
			publicName: null,
			email: null,
		});
		return temporaryId;
	},
	onError: (trpcContext) => (_error, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		cache.users.getPaged.remove(trpcContext, temporaryId);
	},
	onSuccess:
		(trpcContext) =>
		({ id: actualId, connection }, variables, temporaryId) => {
			cache.users.getPaged.update(trpcContext, temporaryId, (user) => ({
				...user,
				id: actualId,
			}));
			cache.users.get.add(trpcContext, {
				remoteId: actualId,
				localId: actualId,
				name: variables.name,
				publicName: null,
				email: null,
			});
			cache.users.getName.add(trpcContext, actualId, variables.name);
			if (connection && !connection.connected) {
				cache.accountConnections.getAll.outbound.add(trpcContext, {
					accountId: connection.id,
					email: variables.email!,
					userId: actualId,
					userName: variables.name,
				});
			}
		},
};
