import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"auth.register",
	{ name: string }
> = {
	onSuccess:
		(controllerContext, { name }) =>
		({ account }, variables) =>
			cache.account.update(controllerContext, {
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
			}),
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
