import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"auth.register",
	{ name: string }
> = {
	onSuccess:
		(controllerContext, { name }) =>
		async ({ account }, variables) => {
			await controllerContext.trpcUtils.invalidate();
			updateAccount(controllerContext, {
				get: (controller) =>
					controller.upsert({
						user: { name },
						account: {
							id: account.id,
							email: variables.email,
							verified: false,
							avatarUrl: undefined,
							role: undefined,
						},
					}),
			});
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
