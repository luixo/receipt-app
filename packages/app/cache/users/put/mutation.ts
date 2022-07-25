import { v4 } from "uuid";

import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, UsersId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"users.put",
	UsersId,
	{
		pagedInput: Cache.Users.GetPaged.Input;
		selfAccountId: AccountsId;
	}
> = {
	onMutate:
		(trpcContext, { pagedInput }) =>
		(form) => {
			const temporaryId = v4();
			cache.users.getPaged.add(trpcContext, pagedInput, {
				id: temporaryId,
				name: form.name,
				publicName: null,
				email: null,
			});
			return temporaryId;
		},
	onError:
		(trpcContext, { pagedInput }) =>
		(_error, _variables, temporaryId) => {
			if (!temporaryId) {
				return;
			}
			cache.users.getPaged.remove(
				trpcContext,
				pagedInput,
				(user) => user.id === temporaryId
			);
		},
	onSuccess:
		(trpcContext, { pagedInput, selfAccountId }) =>
		({ id: actualId, connection }, variables, temporaryId) => {
			cache.users.getPaged.update(
				trpcContext,
				pagedInput,
				temporaryId,
				(user) => ({ ...user, id: actualId })
			);
			cache.users.get.add(
				trpcContext,
				{ id: actualId },
				{
					id: actualId,
					name: variables.name,
					publicName: null,
					ownerAccountId: selfAccountId,
					email: null,
				}
			);
			cache.users.getName.add(trpcContext, { id: actualId }, variables.name);
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
