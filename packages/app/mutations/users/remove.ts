import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.remove"> = {
	onMutate:
		(trpcContext) =>
		({ id }) => ({
			revertFns: cache.users.updateRevert(trpcContext, {
				get: (controller) => controller.remove(id),
				getName: (controller) => controller.remove(id),
				getPaged: (controller) => controller.remove(id),
			}),
		}),
	onSuccess: (trpcContext) => () => cache.users.invalidateSuggest(trpcContext),
	mutateToastOptions: {
		text: "Removing user..",
	},
	successToastOptions: {
		text: "User removed",
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing user: ${error.message}`,
	}),
};
