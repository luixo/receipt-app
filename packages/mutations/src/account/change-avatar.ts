import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changeAvatar"> = {
	onSuccess: (controllerContext) => (result) => {
		updateAccount(controllerContext, {
			get: (controller) => {
				controller.update((data) => ({
					...data,
					account: {
						...data.account,
						avatarUrl: result ? result.url : undefined,
					},
				}));
			},
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating your avatar: ${error.message}`,
	}),
};
