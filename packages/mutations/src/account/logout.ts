import { mergeErrors } from "~mutations/utils";

import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.logout"> = {
	mutationKey: "account.logout",
	onSuccess:
		({ queryClient, trpc }) =>
		async () => {
			await queryClient.invalidateQueries(trpc.pathFilter());
		},
	successToastOptions: {
		text: "Logout successful, redirecting..",
	},
	errorToastOptions: () => (errors) => ({
		text: `Logout failed: ${mergeErrors(errors)}`,
	}),
};
