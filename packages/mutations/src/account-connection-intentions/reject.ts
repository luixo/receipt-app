import { mergeErrors } from "~mutations/utils";

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
		errorToastOptions: () => (errors) => ({
			text: `Error rejecting ${errors.length > 1 ? "invites" : "invite"}: ${mergeErrors(errors)}`,
		}),
	};
