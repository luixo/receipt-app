import { mergeErrors } from "~mutations/utils";

import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import {
	invalidateSuggest as invalidateSuggestUsers,
	update as updateUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

import { getUsersText } from "./utils";

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
	mutateToastOptions: () => (variablesSet) => ({
		text: `Adding user${variablesSet.length > 1 ? "s" : ""} ${getUsersText(variablesSet)}..`,
	}),
	successToastOptions: () => (_resultSet, variablesSet) => ({
		text: `User${variablesSet.length > 1 ? "s" : ""} ${getUsersText(variablesSet)} added`,
	}),
	errorToastOptions: () => (errors, variablesSet) => ({
		text: `Error adding user${variablesSet.length > 1 ? "s" : ""} ${getUsersText(variablesSet)}: ${mergeErrors(errors)}`,
	}),
};
