import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import {
	invalidateSuggest as invalidateSuggestUsers,
	update as updateUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.add"> = {
	mutationKey: "users.add",
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
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.addUser.mutate", {
				ns: "users",
				usersAmount: variablesSet.length,
				users: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	successToastOptions:
		({ t }) =>
		(_resultSet, variablesSet) => ({
			text: t("toasts.addUser.success", {
				ns: "users",
				usersAmount: variablesSet.length,
				users: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.addUser.error", {
				ns: "users",
				usersAmount: variablesSet.length,
				users: variablesSet.map((variables) => `"${variables.name}"`),
				errors,
			}),
		}),
};
