import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.login"> = {
	onSuccess:
		(controllerContext) =>
		({ account, user }, variables) =>
			cache.account.update(controllerContext, {
				get: (controller) =>
					controller.upsert({
						account: { ...account, email: variables.email },
						user,
					}),
			}),
	successToastOptions: {
		text: "Login successful, redirecting..",
	},
	errorToastOptions: () => (error) => ({
		text: error.message,
	}),
};
