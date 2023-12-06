import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

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
