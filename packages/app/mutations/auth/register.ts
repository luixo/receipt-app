import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<
	"auth.register",
	{ name: string }
> = {
	onSuccess:
		(controllerContext, { name }) =>
		({ account }) =>
			cache.account.update(controllerContext, {
				get: (controller) =>
					controller.upsert({
						user: { name },
						account: { id: account.id, verified: false, avatarUrl: undefined },
					}),
			}),
	mutateToastOptions: {
		text: "Registering..",
	},
	successToastOptions: {
		text: "Register successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
