import { v4 } from "uuid";

import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, ReceiptsId, UsersId } from "next-app/src/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"receipts.add",
	{ temporaryId: ReceiptsId; sinceCursor?: number },
	{ selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { selfAccountId }) =>
		(variables) => {
			const temporaryId = v4();
			const sinceCursor = cache.receipts.getPaged.add(trpcContext, {
				id: temporaryId,
				role: "owner",
				name: variables.name,
				issued: variables.issued,
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
				sum: 0,
			});
			return { temporaryId, sinceCursor };
		},
	onError: (trpcContext) => (_error, _variables, snapshot) => {
		if (!snapshot) {
			return;
		}
		cache.receipts.getPaged.remove(trpcContext, snapshot.temporaryId);
	},
	onSuccess:
		(trpcContext, { selfAccountId }) =>
		(actualId, variables, snapshot) => {
			cache.receipts.getPaged.invalidate(trpcContext, snapshot!.sinceCursor);
			cache.receipts.getPaged.update(
				trpcContext,
				snapshot!.temporaryId,
				(receipt) => ({
					...receipt,
					id: actualId,
				})
			);
			cache.receipts.get.add(trpcContext, {
				id: actualId,
				role: "owner",
				name: variables.name,
				issued: variables.issued,
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
