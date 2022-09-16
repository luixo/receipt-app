import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { AccountsId, UsersId } from "next-app/src/db/models";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	onSuccess:
		(trpcContext, { selfAccountId }) =>
		(id, variables) => {
			cache.receipts.update(trpcContext, {
				getPaged: (controller) => {
					const sinceCursor = controller.add({
						id,
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
					controller.invalidate(sinceCursor);
				},
				get: (controller) =>
					controller.add({
						id,
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
					}),
				getName: (controller) => controller.upsert(id, variables.name),
				getNonResolvedAmount: noop,
				getResolvedParticipants: (controller) => controller.upsert(id, []),
			});
		},
};
