import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		({ queryClient, trpc }) =>
		async ({ account, user }, variables) => {
			await queryClient.invalidateQueries(trpc.pathFilter());
			updateAccount(
				{ queryClient, trpc },
				{
					get: (controller) =>
						controller.upsert({
							account: { ...account, email: variables.email },
							user,
						}),
				},
			);
		},
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
