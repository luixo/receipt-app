import { v4 } from "uuid";

import { cache, Cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { AccountsId, ReceiptsId, UsersId } from "next-app/src/db/models";

export const putMutationOptions: UseContextedMutationOptions<
	"receipts.put",
	ReceiptsId,
	{ input: Cache.Receipts.GetPaged.Input; selfAccountId: AccountsId }
> = {
	onMutate:
		(trpcContext, { input, selfAccountId }) =>
		(variables) => {
			const temporaryId = v4();
			cache.receipts.getPaged.add(trpcContext, input, {
				id: temporaryId,
				role: "owner",
				name: variables.name,
				issued: new Date(),
				currency: variables.currency,
				resolved: false,
				participantResolved: false,
				// Typesystem doesn't know that we use account id as self user id
				userId: selfAccountId as UsersId,
			});
			return temporaryId;
		},
	onError:
		(trpcContext, { input }) =>
		(_error, _variables, temporaryId) => {
			if (!temporaryId) {
				return;
			}
			cache.receipts.getPaged.remove(
				trpcContext,
				input,
				(receipt) => receipt.id === temporaryId
			);
		},
	onSuccess:
		(trpcContext, { input, selfAccountId }) =>
		(actualId, variables, temporaryId) => {
			cache.receipts.getPaged.update(
				trpcContext,
				input,
				temporaryId,
				(receipt) => ({
					...receipt,
					id: actualId,
					dirty: false,
				})
			);
			cache.receipts.get.add(
				trpcContext,
				{ id: actualId },
				{
					id: actualId,
					role: "owner",
					name: variables.name,
					issued: new Date(),
					currency: variables.currency,
					resolved: false,
					sum: 0,
					dirty: false,
					participantResolved: false,
					// Typesystem doesn't know that we use account id as self user id
					ownerUserId: selfAccountId as UsersId,
				}
			);
			cache.receipts.getName.update(
				trpcContext,
				{ id: actualId },
				variables.name
			);
		},
};
