import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.changeAvatar"> = {
	mutationKey: "account.changeAvatar",
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
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.changeAvatar.error", { ns: "account", errors }),
		}),
};
