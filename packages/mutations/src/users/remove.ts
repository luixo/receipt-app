import {
	invalidateSuggest as invalidateSuggestUsers,
	updateRevert as updateRevertUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.remove"> = {
	onMutate:
		(controllerContext) =>
		({ id }) =>
			updateRevertUsers(controllerContext, {
				get: (controller) => controller.remove(id),
				getForeign: (controller) => controller.removeOwn(id),
				getPaged: (controller) => controller.remove(id),
			}),
	onSuccess: (controllerContext) => () =>
		invalidateSuggestUsers(controllerContext),
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
