import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.resendEmail"> = {
	errorToastOptions: () => (error) => ({
		text: `Error resending email: ${error.message}`,
	}),
};
