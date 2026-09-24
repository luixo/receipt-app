import { updateRevert as updateRevertUserConnections } from "../cache/user-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updatePeerConnected } from "./utils";

export const options: UseContextedMutationOptions<"userConnectionIntentions.accept"> =
	{
		mutationKey: "userConnectionIntentions.accept",
		onMutate: (controllerContext) => (variables) =>
			updateRevertUserConnections(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.userId),
			}),
		onSuccess: (controllerContext) => (user, variables) => {
			updatePeerConnected(controllerContext, variables.peerId, user);
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
