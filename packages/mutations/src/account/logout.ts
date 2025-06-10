import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.logout"> = {
	onSuccess:
		({ queryClient, trpc }) =>
		async () => {
			await queryClient.invalidateQueries(trpc.pathFilter());
		},
	successToastOptions: {
		text: "Logout successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: `Error logging out: ${error.message}`,
	}),
};
