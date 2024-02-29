import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changePassword"> = {
	errorToastOptions: () => (error) => ({
		text: `Error changing password: ${error.message}`,
	}),
};
