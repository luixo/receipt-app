import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"account.resendEmail"> = {
	errorToastOptions: () => (error) => ({
		text: `Error resending email: ${error.message}`,
	}),
};
