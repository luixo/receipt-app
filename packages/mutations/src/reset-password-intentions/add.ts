import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"resetPasswordIntentions.add"> =
	{
		mutationKey: "resetPasswordIntentions.add",
		successToastOptions: () => (_result, variablesSet) => ({
			text: `Password reset link was sent to email "${variablesSet[0].email}"`,
		}),
		errorToastOptions:
			({ t }) =>
			(errors) => ({
				text: t("toasts.addResetPasswordIntention.error", {
					ns: "login",
					errors,
				}),
			}),
	};
