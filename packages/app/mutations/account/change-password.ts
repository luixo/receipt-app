import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"account.changePassword"> = {
	errorToastOptions: () => (error) => ({
		text: `Error changing password: ${error.message}`,
	}),
};
