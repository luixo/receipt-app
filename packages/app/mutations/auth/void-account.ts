import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"auth.voidAccount"> = {
	successToastOptions: {
		text: "Account successfully voided, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: `Error voiding account: ${error.message}`,
	}),
};
