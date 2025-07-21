import { mergeErrors } from "~mutations/utils";

import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { getEmailTexts, updateUserConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		mutationKey: "accountConnectionIntentions.add",
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				updateUserConnected(
					controllerContext,
					variables.userId,
					result.account,
				);
			} else {
				updateAccountConnections(controllerContext, {
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
		mutateToastOptions: () => (variablesSet) => ({
			text: `Sending connection intention${variablesSet.length > 1 ? "s" : ""} to ${getEmailTexts(variablesSet)}..`,
		}),
		successToastOptions: () => (_result, variablesSet) => ({
			text: `Connection intention${variablesSet.length > 1 ? "s" : ""} to ${getEmailTexts(variablesSet)} sent`,
		}),
		errorToastOptions: () => (errors) => ({
			text: `Error sending connection intention${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
		}),
	};
