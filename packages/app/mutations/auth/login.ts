import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(trpcContext) =>
		({ accountId, ...account }) =>
			cache.account.update(trpcContext, {
				get: (controller) => controller.upsert({ id: accountId, ...account }),
			}),
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
