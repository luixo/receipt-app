import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"resetPasswordIntentions.add"> =
	{
		successToastOptions: () => (_result, variables) => ({
			text: `Password reset link was sent to email "${variables.email}"`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error resetting password: ${error.message}`,
		}),
	};
