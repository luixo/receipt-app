import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updateUserConnected } from "./utils";

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
		mutateToastOptions:
			({ t }) =>
			(variablesSet) => ({
				text: t("toasts.addIntention.mutate", {
					ns: "users",
					intentionsAmount: variablesSet.length,
					emails: variablesSet.map((variables) => `"${variables.email}"`),
				}),
			}),
		successToastOptions:
			({ t }) =>
			(_result, variablesSet) => ({
				text: t("toasts.addIntention.success", {
					ns: "users",
					intentionsAmount: variablesSet.length,
					emails: variablesSet.map((variables) => `"${variables.email}"`),
				}),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.addIntention.error", {
					ns: "users",
					intentionsAmount: errors.length,
					errors,
				}),
			}),
	};
