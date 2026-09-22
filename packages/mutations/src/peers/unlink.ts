import { updateRevert as updateRevertPeers } from "../cache/peers";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"peers.unlink"> = {
	mutationKey: "peers.unlink",
	onMutate: (controllerContext) => (variables) =>
		updateRevertPeers(controllerContext, {
			get: (controller) =>
				controller.update(
					variables.id,
					(peer) => ({ ...peer, connectedAccount: undefined }),
					(snapshot) => (peer) => ({
						...peer,
						connectedAccount: snapshot.connectedAccount,
					}),
				),
			getForeign: (controller) => controller.removeOwn(variables.id),
			getPaged: undefined,
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.unlinkPeer.error", {
				ns: "peers",
				peersAmount: errors.length,
				errors,
			}),
		}),
};
