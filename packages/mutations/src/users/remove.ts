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
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.removeUser.mutate", {
				ns: "users",
				usersAmount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(_resultSet, variablesSet) => ({
			text: t("toasts.removeUser.success", {
				ns: "users",
				usersAmount: variablesSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.removeUser.error", {
				ns: "users",
				usersAmount: errors.length,
				errors,
			}),
		}),
};
