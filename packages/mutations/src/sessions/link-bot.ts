import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"bot.link"> = {
	mutationKey: "bot.link",
	mutateToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.linkBot.mutate", { ns: "bot" }),
		}),
	successToastOptions:
		({ t }) =>
		() => ({
			text: t("toasts.linkBot.success", { ns: "bot" }),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.linkBot.error", { ns: "bot", errors }),
		}),
};
