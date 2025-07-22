import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.voidAccount"> = {
	mutationKey: "auth.voidAccount",
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.voidAccount.success", { ns: "void-account" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.voidAccount.error", { ns: "void-account", errors }),
		}),
};
