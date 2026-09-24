import { update as updateUser } from "../cache/user";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.confirmEmail"> = {
	mutationKey: "auth.confirmEmail",
	onSuccess: (controllerContext) => () =>
		updateUser(controllerContext, {
			get: (controller) => {
				controller.update((user) => ({ ...user, verified: true }));
			},
		}),
	mutateToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.confirmEmail.mutate", { ns: "register" }),
		}),
	successToastOptions:
		({ t }) =>
		(result) => ({
			text: t("toasts.confirmEmail.success", {
				ns: "register",
				email: result[0].email,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.confirmEmail.error", { ns: "register", errors }),
		}),
};
