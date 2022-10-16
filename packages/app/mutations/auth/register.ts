import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<
	"auth.register",
	{ name: string }
> = {
	onSuccess:
		(trpcContext, { name }) =>
		({ account }) =>
			cache.account.update(trpcContext, {
				get: (controller) =>
					controller.upsert({
						user: { name },
						account: { id: account.id, verified: false },
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
