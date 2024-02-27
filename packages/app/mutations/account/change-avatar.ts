import { cache } from "~app/cache";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

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
