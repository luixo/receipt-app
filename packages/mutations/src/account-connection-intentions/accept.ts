import { mergeErrors } from "~mutations/utils";

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
		errorToastOptions: () => (errors) => ({
			text: `Error accepting invite${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
		}),
	};
