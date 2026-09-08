import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"sessions.linkBot"> = {
	mutationKey: "sessions.linkBot",
	mutateToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.linkBot.mutate", { ns: "bot-link" }),
		}),
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.linkBot.success", { ns: "bot-link" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.linkBot.error", { ns: "bot-link", errors }),
		}),
};
