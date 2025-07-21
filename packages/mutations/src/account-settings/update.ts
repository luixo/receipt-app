import { mergeErrors } from "~mutations/utils";

import { updateRevert as updateRevertAccountSettings } from "../cache/account-settings";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountSettings.update"> = {
	mutationKey: "accountSettings.update",
	onMutate: (controllerContext) => (variables) =>
		updateRevertAccountSettings(controllerContext, {
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
	errorToastOptions: () => (errors) => ({
		text: `Account settings update failed: ${mergeErrors(errors)}`,
	}),
};
