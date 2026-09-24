import { update as updateUser } from "../cache/user";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.register"> = {
	mutationKey: "auth.register",
	onSuccess:
		({ queryClient, trpc }) =>
		async ({ user: { id, verified } }, variables) => {
			await queryClient.invalidateQueries(trpc.pathFilter());
			updateUser(
				{ queryClient, trpc },
				{
					get: (controller) => {
						controller.upsert({
							peer: { name: variables.name },
							user: {
								id,
								email: variables.email,
								verified,
								avatarUrl: undefined,
								role: undefined,
							},
						});
					},
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
