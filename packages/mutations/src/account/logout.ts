import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"account.logout"> = {
	mutationKey: "account.logout",
	onSuccess:
		({ queryClient, trpc }) =>
		async () => {
			await queryClient.invalidateQueries(trpc.pathFilter());
		},
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.logout.success", { ns: "account" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.logout.error", {
				ns: "account",
				errors,
			}),
		}),
};
