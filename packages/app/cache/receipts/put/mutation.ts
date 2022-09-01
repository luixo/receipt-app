import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, ReceiptsId, UsersId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	{ selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { selfAccountId }) =>
		(variables) => {
			const temporaryId = v4();
			cache.receipts.getPaged.add(trpcContext, {
				id: temporaryId,
				role: "owner",
				name: variables.name,
				issued: new Date(),
				currency: variables.currency,
				// Typesystem doesn't know that we use account id as self user id
				participantResolved: variables.userIds?.includes(
					selfAccountId as UsersId
				)
					? false
					: null,
				locked: false,
				remoteUserId: selfAccountId as UsersId,
				localUserId: selfAccountId as UsersId,
			});
			return temporaryId;
		},
	onError: (trpcContext) => (_error, _variables, temporaryId) => {
		if (!temporaryId) {
			return;
		}
		cache.receipts.getPaged.remove(trpcContext, temporaryId);
	},
	onSuccess:
		(trpcContext, { selfAccountId }) =>
		(actualId, variables, temporaryId) => {
			cache.receipts.getPaged.update(trpcContext, temporaryId, (receipt) => ({
				...receipt,
				id: actualId,
			}));
			cache.receipts.get.add(trpcContext, {
				id: actualId,
				role: "owner",
				name: variables.name,
				issued: new Date(),
				currency: variables.currency,
				locked: false,
				sum: 0,
				// Typesystem doesn't know that we use account id as self user id
				participantResolved: variables.userIds?.includes(
					selfAccountId as UsersId
				)
					? false
					: null,
				ownerUserId: selfAccountId as UsersId,
				selfUserId: selfAccountId as UsersId,
			});
			cache.receipts.getName.update(trpcContext, actualId, variables.name);
		},
};
