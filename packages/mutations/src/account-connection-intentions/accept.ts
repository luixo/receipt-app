import { updateRevert as updateRevertAccountConnections } from "../cache/account-connection-intentions";
import type { UseContextedMutationOptions } from "../context";

import { updateUserConnected } from "./utils";

export const options: UseContextedMutationOptions<"accountConnectionIntentions.accept"> =
	{
		mutationKey: "accountConnectionIntentions.accept",
		onMutate: (controllerContext) => (variables) =>
			updateRevertAccountConnections(controllerContext, {
				getAll: (controller) => controller.inbound.remove(variables.accountId),
			}),
		onSuccess: (controllerContext) => (account, variables) => {
			updateUserConnected(controllerContext, variables.userId, account);
		},
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.acceptInvite.error", {
					ns: "users",
					invitesAmount: errors.length,
					errors,
				}),
			}),
	};
