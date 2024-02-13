import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		onMutate: (controllerContext) => (variables) =>
			cache.accountConnections.updateRevert(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			cache.receipts.update(controllerContext, {
				get: undefined,
				getPaged: undefined,
				getResolvedParticipants: (controller) =>
					controller.invalidateBy((participants) =>
						participants.some(
							(participant) => participant.remoteUserId === variables.userId,
						),
					),
				getNonResolvedAmount: undefined,
			});
			cache.users.update(controllerContext, {
				get: (controller) =>
					controller.update(variables.userId, (user) => ({
						...user,
						connectedAccount: account,
					})),
				getForeign: (controller) => {
					controller.updateOwn(variables.userId, (user) => ({
						...user,
						connectedAccount: account,
					}));
					controller.invalidateForeign();
				},
				getPaged: undefined,
			});
			void cache.users.invalidateSuggest(controllerContext);
		},
		errorToastOptions: () => (error) => ({
			text: `Error accepting an invite: ${error.message}`,
		}),
	};
