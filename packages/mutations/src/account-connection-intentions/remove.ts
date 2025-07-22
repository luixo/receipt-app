import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.remove"> =
	{
		mutationKey: "accountConnectionIntentions.remove",
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) =>
					controller.outbound.remove(variables.targetAccountId),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.removeInvite.error", {
					ns: "users",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
