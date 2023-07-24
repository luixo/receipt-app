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
					controller.add({
						id,
						role: "owner",
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						// Typesystem doesn't know that we use account id as self user id
						participantResolved: variables.userIds?.includes(
							selfAccountId as UsersId,
						)
							? false
							: null,
						lockedTimestamp: undefined,
						remoteUserId: selfAccountId as UsersId,
						localUserId: selfAccountId as UsersId,
						sum: 0,
					});
				},
				get: (controller) =>
					controller.add({
						id,
						role: "owner",
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						sum: 0,
						// Typesystem doesn't know that we use account id as self user id
						participantResolved: variables.userIds?.includes(
							selfAccountId as UsersId,
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
	mutateToastOptions: () => (variables) => ({
		text: `Adding receipt "${variables.name}"..`,
	}),
	successToastOptions: () => (_result, variables) => ({
		text: `Receipt "${variables.name}" added`,
	}),
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding receipt "${variables.name}": ${error.message}`,
	}),
};
