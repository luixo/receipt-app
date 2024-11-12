import { updateRevert as updateRevertUsers } from "../cache/users";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"users.unlink"> = {
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
	errorToastOptions: () => (error) => ({
		text: `Error unlinking user: ${error.message}`,
	}),
};
