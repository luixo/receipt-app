import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(trpcContext) =>
		({ account, user }) =>
			cache.account.update(trpcContext, {
				get: (controller) => controller.upsert({ account, user }),
			}),
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
