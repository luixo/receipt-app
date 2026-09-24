import { updateRevert as updateRevertUserConnections } from "../cache/user-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"userConnectionIntentions.reject"> =
	{
		mutationKey: "userConnectionIntentions.reject",
		onMutate: (controllerContext) => (variables) =>
			updateRevertUserConnections(controllerContext, {
				getAll: (controller) =>
					controller.inbound.remove(variables.sourceUserId),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.rejectInvite.error", {
					ns: "peers",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
