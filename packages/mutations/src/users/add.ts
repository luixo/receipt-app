import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import {
	invalidateSuggest as invalidateSuggestUsers,
	update as updateUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.add"> = {
	onSuccess:
		(controllerContext) =>
		({ id, connection }, variables) => {
			updateUsers(controllerContext, {
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
				updateAccountConnections(controllerContext, {
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
			void invalidateSuggestUsers(controllerContext);
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
