import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.remove"> = {
	onMutate:
		(controllerContext) =>
		({ id }) =>
			cache.users.updateRevert(controllerContext, {
				get: (controller) => controller.remove(id),
				getForeign: (controller) => controller.removeOwn(id),
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
