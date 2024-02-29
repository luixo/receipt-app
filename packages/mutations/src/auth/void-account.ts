import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.voidAccount"> = {
	successToastOptions: {
		text: "Account successfully voided, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: `Error voiding account: ${error.message}`,
	}),
};
