import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

export const options: UseContextedMutationOptions<
	"receipts.remove",
	{
		participantResolved: boolean | null;
	}
> = {
	onMutate:
		(controllerContext, { participantResolved }) =>
		(variables) =>
			cache.receipts.updateRevert(controllerContext, {
				get: (controller) => controller.remove(variables.id),
				getPaged: (controller) => controller.remove(variables.id),
				getName: (controller) => controller.remove(variables.id),
				getResolvedParticipants: (controller) =>
					controller.invalidate(variables.id),
				getNonResolvedAmount: (controller) => {
					if (participantResolved === false) {
						return controller.update(
							(prev) => prev - 1,
							() => (prev) => prev + 1,
						);
					}
				},
			}),
	onSuccess: (controllerContext) => (_result, variables) => {
		cache.receipts.update(controllerContext, {
			get: undefined,
			getPaged: (controller) => controller.remove(variables.id),
			getName: undefined,
			getResolvedParticipants: undefined,
			getNonResolvedAmount: undefined,
		});
	},
	mutateToastOptions: {
		text: "Removing receipt..",
	},
	successToastOptions: {
		text: "Receipt removed",
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing receipt: ${error.message}`,
	}),
};
