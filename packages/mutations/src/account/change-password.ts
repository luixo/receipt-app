import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changePassword"> = {
	mutationKey: "account.changePassword",
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changePassword.error", { ns: "account", errors }),
		}),
};
