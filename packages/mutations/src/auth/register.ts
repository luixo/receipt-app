import { update as updateAccount } from "../cache/account";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.register"> = {
	mutationKey: "auth.register",
	onSuccess:
		({ queryClient, trpc }) =>
		async ({ account: { id, verified } }, variables) => {
			await queryClient.invalidateQueries(trpc.pathFilter());
			updateAccount(
				{ queryClient, trpc },
				{
					get: (controller) =>
						controller.upsert({
							user: { name: variables.name },
							account: {
								id,
								email: variables.email,
								verified,
								avatarUrl: undefined,
								role: undefined,
							},
						}),
				},
			);
		},
	mutateToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.register.mutate", { ns: "register" }),
		}),
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.register.success", { ns: "register" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.register.error", { ns: "register", errors }),
		}),
};
