import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"receipts.remove",
	{
		selfResolved: boolean | undefined;
	}
> = {
	onMutate:
		(controllerContext, { selfResolved }) =>
		(variables) =>
			cache.receipts.updateRevert(controllerContext, {
				get: (controller) => controller.remove(variables.id),
				getPaged: (controller) => controller.remove(variables.id),
				getNonResolvedAmount: (controller) => {
					if (selfResolved === false) {
						return controller.update(
							(prev) => prev - 1,
							() => (prev) => prev + 1,
						);
					}
				},
			}),
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
