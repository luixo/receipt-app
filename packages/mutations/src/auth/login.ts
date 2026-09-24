import { update as updateUser } from "../cache/user";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"auth.login"> = {
	mutationKey: "auth.login",
	onSuccess:
		({ queryClient, trpc }) =>
		async ({ user, peer }, variables) => {
			await queryClient.invalidateQueries(trpc.pathFilter());
			updateUser(
				{ queryClient, trpc },
				{
					get: (controller) => {
						controller.upsert({
							user: { ...user, email: variables.email },
							peer,
						});
					},
				},
			);
		},
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.login.success", { ns: "login" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.login.error", { ns: "login", errors }),
		}),
};
