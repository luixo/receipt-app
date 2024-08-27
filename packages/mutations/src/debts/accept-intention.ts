import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

import type Intention from "./utils";
import { updateGet, updateGetByUserId, updateGetByUsers } from "./utils";

export const options: UseContextedMutationOptions<
	"debts.acceptIntention",
	Intention
> = {
	onMutate: (controllerContext, intention) => () =>
		updateRevertDebts(controllerContext, {
			getByUsers: (controller) => updateGetByUsers(controller, [intention]),
			getIdsByUser: (controller) => updateGetByUserId(controller, [intention]),
			get: (controller) => updateGet(controller, [intention]),
			getIntentions: (controller) => controller.remove(intention.id),
		}),
	mutateToastOptions: {
		text: `Accepting debt..`,
	},
	successToastOptions: {
		text: `Debt accepted successfully`,
	},
	errorToastOptions: () => (error) => ({
		text: `Error accepting debt: ${error.message}`,
	}),
};
