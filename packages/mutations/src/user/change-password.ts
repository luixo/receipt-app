import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"user.changePassword"> = {
	mutationKey: "user.changePassword",
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changePassword.error", { ns: "user", errors }),
		}),
};
