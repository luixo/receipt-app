import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updatePeerConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.add"> =
	{
		mutationKey: "accountConnectionIntentions.add",
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				updatePeerConnected(
					controllerContext,
					variables.peerId,
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
							peer: {
								id: variables.peerId,
								name: result.peer.name,
							},
						}),
				});
			}
		},
		mutateToastOptions:
			({ t }) =>
			(variablesSet) => ({
				text: t("toasts.addIntention.mutate", {
					ns: "peers",
					intentionsAmount: variablesSet.length,
					emails: variablesSet.map((variables) => `"${variables.email}"`),
				}),
			}),
		successToastOptions:
			({ t }) =>
			(_result, variablesSet) => ({
				text: t("toasts.addIntention.success", {
					ns: "peers",
					intentionsAmount: variablesSet.length,
					emails: variablesSet.map((variables) => `"${variables.email}"`),
				}),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.addIntention.error", {
					ns: "peers",
					intentionsAmount: errors.length,
					errors,
				}),
			}),
	};
