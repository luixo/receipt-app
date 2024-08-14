import {
	update as updateDebts,
	updateRevert as updateRevertDebts,
} from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

import type Intention from "./utils";
import {
	updateGet,
	updateGetByUsers,
	updateGetUser,
	updateGetUserSuccess,
} from "./utils";

export const options: UseContextedMutationOptions<
	"debts.acceptAllIntentions",
	Intention[]
> = {
	onMutate: (controllerContext, intentions) => () =>
		updateRevertDebts(controllerContext, {
			getByUsers: (controller) => updateGetByUsers(controller, intentions),
			getUser: (controller) => updateGetUser(controller, intentions),
			get: (controller) => updateGet(controller, intentions),
			getIntentions: (controller) =>
				mergeUpdaterResults(
					...intentions.map(({ id }) => controller.remove(id)),
				),
		}),
	onSuccess: (controllerContext, intentions) => (createdResult) => {
		updateDebts(controllerContext, {
			getByUsers: undefined,
			getUser: (controller) =>
				updateGetUserSuccess(
					controller,
					intentions.map((intention) => {
						const matchedCreatedResult = createdResult.find(
							({ id }) => id === intention.id,
						);
						if (!matchedCreatedResult) {
							throw new Error(
								`Expected to have matched created result for intention ${intention.id}`,
							);
						}
						return {
							...intention,
							created: matchedCreatedResult.created,
						};
					}),
				),
			get: undefined,
			getIntentions: undefined,
		});
	},
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
