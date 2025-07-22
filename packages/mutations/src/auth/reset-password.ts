import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.resetPassword"> = {
	mutationKey: "auth.resetPassword",
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.resetPassword.success", { ns: "reset-password" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.resetPassword.error", { ns: "reset-password", errors }),
		}),
};
