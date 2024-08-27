import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

import type Intention from "./utils";
import { updateGet, updateGetByUserId, updateGetByUsers } from "./utils";

export const options: UseContextedMutationOptions<
	"debts.acceptAllIntentions",
	Intention[]
> = {
	onMutate: (controllerContext, intentions) => () =>
		updateRevertDebts(controllerContext, {
			getByUsers: (controller) => updateGetByUsers(controller, intentions),
			getIdsByUser: (controller) => updateGetByUserId(controller, intentions),
			get: (controller) => updateGet(controller, intentions),
			getIntentions: (controller) =>
				mergeUpdaterResults(
					...intentions.map(({ id }) => controller.remove(id)),
				),
		}),
	mutateToastOptions: {
		text: `Accepting all debts..`,
	},
	successToastOptions: {
		text: `All debts accepted successfully`,
	},
	errorToastOptions: () => (error) => ({
		text: `Error accepting all debts: ${error.message}`,
	}),
};
