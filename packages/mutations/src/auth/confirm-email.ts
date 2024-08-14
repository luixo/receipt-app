import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
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
		text: `Email "${result.email}" confirmed!`,
	}),
	errorToastOptions: () => (error) => ({
		text: `Error confirming email: ${error.message}`,
	}),
};
