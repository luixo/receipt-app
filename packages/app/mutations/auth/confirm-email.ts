import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
	onSuccess: (controllerContext) => () =>
		cache.account.update(controllerContext, {
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
