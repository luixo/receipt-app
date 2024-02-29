import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.add"> = {
	onSuccess:
		(controllerContext) =>
		({ id, connection }, variables) => {
			cache.users.update(controllerContext, {
				get: (controller) =>
					controller.add({
						id,
						name: variables.name,
						publicName: undefined,
						connectedAccount: undefined,
					}),
				getForeign: undefined,
				getPaged: (controller) => controller.invalidate(),
			});
			if (connection && !connection.connected) {
				cache.accountConnections.update(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: connection.account.id,
								email: connection.account.email,
							},
							user: {
								id,
								name: variables.name,
							},
						}),
				});
			}
			void cache.users.invalidateSuggest(controllerContext);
		},
	mutateToastOptions: () => (variables) => ({
		text: `Adding user "${variables.name}"..`,
	}),
	successToastOptions: () => (_result, variables) => ({
		text: `User "${variables.name}" added`,
	}),
	errorToastOptions: () => (error, variables) => ({
		text: `Error adding user "${variables.name}": ${error.message}`,
	}),
};
