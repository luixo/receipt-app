import { mergeErrors } from "~mutations/utils";

import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
	mutationKey: "auth.confirmEmail",
	onSuccess: (controllerContext) => () =>
		updateAccount(controllerContext, {
			get: (controller) => {
				controller.update((account) => ({ ...account, verified: true }));
			},
		}),
	mutateToastOptions: {
		text: "Confirming email..",
	},
	successToastOptions: () => (result) => ({
		text: `Email "${result[0].email}" confirmed!`,
	}),
	errorToastOptions: () => (errors) => ({
		text: `Email confirmation failed: ${mergeErrors(errors)}`,
	}),
};
