import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.reject"> =
	{
		mutationKey: "accountConnectionIntentions.reject",
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) =>
					controller.inbound.remove(variables.sourceAccountId),
			}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.rejectInvite.error", {
					ns: "users",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
