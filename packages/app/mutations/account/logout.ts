import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<"account.logout"> = {
	successToastOptions: {
		text: "Logout successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: `Error logging out: ${error.message}`,
	}),
};
