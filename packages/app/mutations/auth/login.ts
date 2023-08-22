import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(controllerContext) =>
		({ account, user }) =>
			cache.account.update(controllerContext, {
				get: (controller) => controller.upsert({ account, user }),
			}),
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
