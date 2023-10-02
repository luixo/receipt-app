import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import type { Intention } from "./utils";
import {
	updateGet,
	updateGetByUsers,
	updateGetUser,
	updateGetUserSuccess,
} from "./utils";

export const options: UseContextedMutationOptions<
	"debts.acceptIntention",
	Intention
> = {
	onMutate: (controllerContext, intention) => () =>
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) => updateGetByUsers(controller, [intention]),
			getUser: (controller) => updateGetUser(controller, [intention]),
			get: (controller) => updateGet(controller, [intention]),
			getIntentions: (controller) => controller.remove(intention.id),
		}),
	onSuccess:
		(controllerContext, intention) =>
		({ created }) => {
			cache.debts.update(controllerContext, {
				getByUsers: undefined,
				getUser: (controller) =>
					updateGetUserSuccess(controller, [{ ...intention, created }]),
				get: undefined,
				getIntentions: undefined,
			});
		},
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
