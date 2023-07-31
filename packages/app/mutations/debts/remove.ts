import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";

export const options: UseContextedMutationOptions<
	"debts.remove",
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (controllerContext, currDebt) => (updateObject) =>
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) =>
				controller.update(
					currDebt.userId,
					currDebt.currencyCode,
					(sum) => sum - currDebt.amount,
					() => (sum) => sum + currDebt.amount,
				),
			getUser: (controller) =>
				controller.remove(currDebt.userId, updateObject.id),
			// We remove the debt from everywhere else
			// but it's own page
			// otherwise the page will try to refetch the data immediately
			get: noop,
			getIntentions: noop,
		}),
	onSuccess: (controllerContext) => (_result, updateObject) => {
		cache.debts.update(controllerContext, {
			getByUsers: noop,
			getUser: noop,
			get: (controller) => controller.remove(updateObject.id),
			getIntentions: noop,
		});
	},
	mutateToastOptions: {
		text: "Removing debt..",
	},
	successToastOptions: {
		text: "Debt removed",
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing debt: ${error.message}`,
	}),
};
