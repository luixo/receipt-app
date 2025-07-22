import { updateRevert as updateRevertUsers } from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.unlink"> = {
	mutationKey: "users.unlink",
	onMutate: (controllerContext) => (variables) =>
		updateRevertUsers(controllerContext, {
			get: (controller) =>
				controller.update(
					variables.id,
					(user) => ({ ...user, connectedAccount: undefined }),
					(snapshot) => (user) => ({
						...user,
						connectedAccount: snapshot.connectedAccount,
					}),
				),
			getForeign: (controller) => controller.removeOwn(variables.id),
			getPaged: undefined,
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.unlinkUser.error", {
				ns: "users",
				usersAmount: errors.length,
				errors,
			}),
		}),
};
