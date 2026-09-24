import { update as updateUserConnections } from "../cache/user-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updatePeerConnected } from "./utils";

export const options: UseContextedMutationOptions<"userConnectionIntentions.add"> =
	{
		mutationKey: "userConnectionIntentions.add",
		onSuccess: (controllerContext) => (result, variables) => {
			if (result.connected) {
				updatePeerConnected(controllerContext, variables.peerId, result.user);
			} else {
				updateUserConnections(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							user: {
								id: result.user.id,
								email: result.user.email,
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
