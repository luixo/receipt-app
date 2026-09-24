import { updateRevert as updateRevertUserSettings } from "../cache/user-settings";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"userSettings.update"> = {
	mutationKey: "userSettings.update",
	onMutate: (controllerContext) => (variables) =>
		updateRevertUserSettings(controllerContext, {
			get: (controller) =>
				controller.update(
					(prevSettings) => ({
						...prevSettings,
						manualAcceptDebts: variables.value,
					}),
					(prevSettings) => (settings) => ({
						...settings,
						manualAcceptDebts: prevSettings.manualAcceptDebts,
					}),
				),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.updateSettings.error", { ns: "settings", errors }),
		}),
};
