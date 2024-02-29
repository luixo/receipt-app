import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<"accountSettings.update"> = {
	onMutate: (controllerContext) => (variables) =>
		cache.accountSettings.updateRevert(controllerContext, {
			get: (controller) =>
				controller.update(
					(prevSettings) => ({
						...prevSettings,
						autoAcceptDebts: variables.value,
					}),
					(prevSettings) => (settings) => ({
						...settings,
						autoAcceptDebts: prevSettings.autoAcceptDebts,
					}),
				),
		}),
	errorToastOptions: () => (error) => ({
		text: `Error updating account settings: ${error.message}`,
	}),
};
