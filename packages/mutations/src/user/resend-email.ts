import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"user.resendEmail"> = {
	mutationKey: "user.resendEmail",
	errorToastOptions:
		({ t }) =>
		(errors) => ({ text: t("toasts.resendEmail.error", { errors }) }),
};
