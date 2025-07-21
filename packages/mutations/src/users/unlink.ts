import { mergeErrors } from "~mutations/utils";

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
	errorToastOptions: () => (errors) => ({
		text: `Error unlinking user${errors.length > 1 ? "s" : ""}: ${mergeErrors(errors)}`,
	}),
};
