import {
	invalidateSuggest as invalidateSuggestPeers,
	update as updatePeers,
} from "../cache/peers";
import { update as updateUserConnections } from "../cache/user-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"peers.add"> = {
	mutationKey: "peers.add",
	onSuccess:
		(controllerContext) =>
		({ id, connection }, variables) => {
			updatePeers(controllerContext, {
				get: (controller) => {
					controller.add({
						id,
						name: variables.name,
						publicName: undefined,
						connectedUser: undefined,
					});
				},
				getForeign: undefined,
				getPaged: (controller) => {
					void controller.invalidate();
				},
			});
			if (connection && !connection.connected) {
				updateUserConnections(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							user: {
								id: connection.user.id,
								email: connection.user.email,
							},
							peer: {
								id,
								name: variables.name,
							},
						}),
				});
			}
			void invalidateSuggestPeers(controllerContext);
		},
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.addPeer.mutate", {
				ns: "peers",
				peersAmount: variablesSet.length,
				peers: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	successToastOptions:
		({ t }) =>
		(_resultSet, variablesSet) => ({
			text: t("toasts.addPeer.success", {
				ns: "peers",
				peersAmount: variablesSet.length,
				peers: variablesSet.map((variables) => `"${variables.name}"`),
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors, variablesSet) => ({
			text: t("toasts.addPeer.error", {
				ns: "peers",
				peersAmount: variablesSet.length,
				peers: variablesSet.map((variables) => `"${variables.name}"`),
				errors,
			}),
		}),
};
