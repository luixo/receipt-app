import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"resetPasswordIntentions.add"> =
	{
		successToastOptions: () => (_result, variables) => ({
			text: `Password reset link was sent to email "${variables.email}"`,
		}),
		errorToastOptions: () => (error) => ({
			text: `Error resetting password: ${error.message}`,
		}),
	};
