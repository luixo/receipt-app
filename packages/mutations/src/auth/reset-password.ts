import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.resetPassword"> = {
	successToastOptions: {
		text: "Password successfully reset",
	},
	errorToastOptions: () => (error) => ({
		text: `Error resetting password: ${error.message}`,
	}),
};
