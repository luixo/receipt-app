import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { AccountsId, UsersId } from "next-app/src/db/models";

export const options: UseContextedMutationOptions<
	"receipts.add",
	{ selfAccountId: AccountsId }
> = {
	onSuccess:
		(controllerContext, { selfAccountId }) =>
		(id, variables) => {
			cache.receipts.update(controllerContext, {
				getPaged: (controller) => {
					controller.add({
						id,
						role: "owner",
						name: variables.name,
						issued: variables.issued,
						currencyCode: variables.currencyCode,
						// Typesystem doesn't know that we use account id as self user id
						participantResolved: variables.participants?.includes(
							selfAccountId as UsersId,
						)
							? false
							: null,
						lockedTimestamp: undefined,
						remoteUserId: selfAccountId as UsersId,
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
						participantResolved: variables.participants?.includes(
							selfAccountId as UsersId,
						)
							? false
							: null,
						ownerUserId: selfAccountId as UsersId,
						selfUserId: selfAccountId as UsersId,
					}),
				getNonResolvedAmount: undefined,
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
