import { mergeErrors } from "~mutations/utils";

import {
	invalidateSuggest as invalidateSuggestUsers,
	updateRevert as updateRevertUsers,
} from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.remove"> = {
	mutationKey: "users.remove",
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
	mutateToastOptions: () => (variablesSet) => ({
		text: `Removing user${variablesSet.length > 1 ? "s" : ""}..`,
	}),
	successToastOptions: () => (_resultSet, variablesSet) => ({
		text: `User${variablesSet.length > 1 ? "s" : ""} removed`,
	}),
	errorToastOptions: () => (errors) => ({
		text: `Error removing user: ${mergeErrors(errors)}`,
	}),
};
