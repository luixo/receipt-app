import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				cache.users.update(controllerContext, {
					get: (controller) => {
						controller.update(variables.userId, (user) => ({
							...user,
							account: result.account,
						}));
					},
					getPaged: (controller) => {
						controller.update(variables.userId, (user) => ({
							...user,
							account: result.account,
						}));
					},
				});
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
			} else {
				cache.accountConnections.update(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: result.account.id,
								email: result.account.email,
							},
							user: {
								id: variables.userId,
								name: result.user.name,
							},
						}),
				});
			}
		},
		mutateToastOptions: () => (variables) => ({
			text: `Sending connection intention to "${variables.email}"..`,
		}),
		successToastOptions: () => (_result, variables) => ({
			text: `Connection intention to "${variables.email}" sent`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error sending connection intention: ${error.message}`,
		}),
	};
