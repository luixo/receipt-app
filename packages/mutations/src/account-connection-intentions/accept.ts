import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updatePeerConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		mutationKey: "accountConnectionIntentions.accept",
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			updatePeerConnected(controllerContext, variables.peerId, account);
		},
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.acceptInvite.error", {
					ns: "peers",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
