import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
	onSuccess: (trpcContext) => () =>
		cache.account.update(trpcContext, {
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
