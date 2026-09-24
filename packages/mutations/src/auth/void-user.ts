import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.voidUser"> = {
	mutationKey: "auth.voidUser",
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.voidUser.success", { ns: "void-user" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.voidUser.error", { ns: "void-user", errors }),
		}),
};
