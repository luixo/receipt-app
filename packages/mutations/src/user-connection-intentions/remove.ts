import { updateRevert as updateRevertUserConnections } from "../cache/user-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"userConnectionIntentions.remove"> =
	{
		mutationKey: "userConnectionIntentions.remove",
		onMutate: (controllerContext) => (variables) =>
			updateRevertUserConnections(controllerContext, {
				getAll: (controller) =>
					controller.outbound.remove(variables.targetUserId),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.removeInvite.error", {
					ns: "peers",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
