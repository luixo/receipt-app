import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(controllerContext) =>
		async ({ account, user }, variables) => {
			await controllerContext.trpcUtils.invalidate();
			updateAccount(controllerContext, {
				get: (controller) =>
					controller.upsert({
						account: { ...account, email: variables.email },
						user,
					}),
			});
		},
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
