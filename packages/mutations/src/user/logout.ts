import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"user.logout"> = {
	mutationKey: "user.logout",
	onSuccess:
		({ queryClient, trpc }) =>
		async () => {
			await queryClient.invalidateQueries(trpc.pathFilter());
		},
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.logout.success", { ns: "user" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.logout.error", {
				ns: "user",
				errors,
			}),
		}),
};
