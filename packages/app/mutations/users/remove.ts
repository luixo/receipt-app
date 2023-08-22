import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"users.remove"> = {
	onMutate:
		(controllerContext) =>
		({ id }) =>
			cache.users.updateRevert(controllerContext, {
				get: (controller) => controller.remove(id),
				getName: (controller) => controller.remove(id),
				getPaged: (controller) => controller.remove(id),
			}),
	onSuccess: (controllerContext) => () =>
		cache.users.invalidateSuggest(controllerContext),
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
