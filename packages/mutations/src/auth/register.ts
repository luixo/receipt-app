import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.register"> = {
	onSuccess:
		({ queryClient, trpc }) =>
		async ({ account }, variables) => {
			await queryClient.invalidateQueries(trpc.pathFilter());
			updateAccount(
				{ queryClient, trpc },
				{
					get: (controller) =>
						controller.upsert({
							user: { name: variables.name },
							account: {
								id: account.id,
								email: variables.email,
								verified: false,
								avatarUrl: undefined,
								role: undefined,
							},
						}),
				},
			);
		},
	mutateToastOptions: {
		text: "Registering..",
	},
	successToastOptions: {
		text: "Register successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
