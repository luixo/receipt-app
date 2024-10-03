import {
	update as updateDebts,
	updateRevert as updateRevertDebts,
} from "../cache/debts";
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
	onSuccess: (controllerContext, intentions) => (results) =>
		updateDebts(controllerContext, {
			getByUsers: undefined,
			getIdsByUser: undefined,
			get: (controller) => {
				intentions.forEach((intention) => {
					const matchedResult = results.find(
						(result) => result.id === intention.id,
					);
					if (!matchedResult) {
						// Could be that intention is cached while the debt is already resolved
						return;
					}
					controller.update(matchedResult.id, (debt) => ({
						...debt,
						updatedAt: matchedResult.updatedAt,
					}));
				});
			},
			getIntentions: undefined,
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
