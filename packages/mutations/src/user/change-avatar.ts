import { update as updateUser } from "../cache/user";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"user.changeAvatar"> = {
	mutationKey: "user.changeAvatar",
	onSuccess: (controllerContext) => (result) => {
		updateUser(controllerContext, {
			get: (controller) => {
				controller.update((data) => ({
					...data,
					user: {
						...data.user,
						avatarUrl: result ? result.url : undefined,
					},
				}));
			},
		});
	},
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changeAvatar.error", { ns: "user", errors }),
		}),
};
