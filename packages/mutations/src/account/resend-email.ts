import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.resendEmail"> = {
	mutationKey: "account.resendEmail",
	errorToastOptions:
		({ t }) =>
		(errors) => ({ text: t("toasts.resendEmail.error", { errors }) }),
};
