import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"users.add",
	{ temporaryId: UsersId; sinceCursor?: number }
> = {
	onMutate: (trpcContext) => (form) => {
		const temporaryId = v4();
		const sinceCursor = cache.users.getPaged.add(trpcContext, {
			id: temporaryId,
			name: form.name,
			publicName: null,
			email: null,
		});
		return { temporaryId, sinceCursor };
	},
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.users.getPaged.remove(trpcContext, snapshot.temporaryId);
	},
	onSuccess:
		(trpcContext) =>
		({ id: actualId, connection }, variables, snapshot) => {
			cache.receipts.getPaged.invalidate(trpcContext, snapshot!.sinceCursor);
			cache.users.getPaged.update(
				trpcContext,
				snapshot!.temporaryId,
				(user) => ({
					...user,
					id: actualId,
				})
			);
			cache.users.get.add(trpcContext, {
				remoteId: actualId,
				localId: actualId,
				name: variables.name,
				publicName: null,
				email: null,
				accountId: null,
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
