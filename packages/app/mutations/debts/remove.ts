import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";

export const options: UseContextedMutationOptions<
	"debts.remove",
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) =>
		cache.debts.updateRevert(trpcContext, {
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
			getReceipt: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				return controller.update(
					currDebt.receiptId,
					currDebt.userId,
					(debt) => ({
						...debt,
						debtId: null,
						// Should verify all cases including the leftover of foreign debt after removing a local one
						syncStatus: { type: "unsync" },
					}),
					(snapshot) => (debt) => ({
						...debt,
						debtId: snapshot.debtId,
						syncStatus: snapshot.syncStatus,
					}),
				);
			},
		}),
	onSuccess: (trpcContext) => (_result, updateObject) => {
		cache.debts.update(trpcContext, {
			getByUsers: noop,
			getUser: noop,
			get: (controller) => controller.remove({ id: updateObject.id }),
			getReceipt: noop,
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
