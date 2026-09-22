import { update as updateAccountConnections } from "../cache/account-connection-intentions";
import {
	invalidateSuggest as invalidateSuggestPeers,
	update as updatePeers,
} from "../cache/peers";
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
						connectedAccount: undefined,
					});
				},
				getForeign: undefined,
				getPaged: (controller) => {
					void controller.invalidate();
				},
			});
			if (connection && !connection.connected) {
				updateAccountConnections(controllerContext, {
					getAll: (controller) =>
						controller.outbound.add({
							account: {
								id: connection.account.id,
								email: connection.account.email,
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
