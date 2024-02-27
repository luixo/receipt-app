import { cache } from "~app/cache";
import { mergeUpdaterResults } from "~app/cache/utils";
import type { UseContextedMutationOptions } from "~app/hooks/use-trpc-mutation-options";

import type { Intention } from "./utils";
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
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) => updateGetByUsers(controller, intentions),
			getUser: (controller) => updateGetUser(controller, intentions),
			get: (controller) => updateGet(controller, intentions),
			getIntentions: (controller) =>
				mergeUpdaterResults(
					...intentions.map(({ id }) => controller.remove(id)),
				),
		}),
	onSuccess: (controllerContext, intentions) => (createdResult) => {
		cache.debts.update(controllerContext, {
			getByUsers: undefined,
			getUser: (controller) =>
				updateGetUserSuccess(
					controller,
					intentions.map((intention) => ({
						...intention,
						created: createdResult.find(({ id }) => id === intention.id)!
							.created,
					})),
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
