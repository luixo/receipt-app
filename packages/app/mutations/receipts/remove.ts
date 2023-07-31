import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";

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
			get: noop,
			getPaged: (controller) => controller.remove(variables.id),
			getName: noop,
			getResolvedParticipants: noop,
			getNonResolvedAmount: noop,
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
