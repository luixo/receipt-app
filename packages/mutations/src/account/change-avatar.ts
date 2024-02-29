import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changeAvatar"> = {
	onSuccess: (controllerContext) => (result) => {
		cache.account.update(controllerContext, {
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
