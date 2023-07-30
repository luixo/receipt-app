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
		}),
	onSuccess: (trpcContext, currDebt) => (_result, updateObject) => {
		cache.debts.update(trpcContext, {
			getByUsers: noop,
			getUser: noop,
			get: (controller) => controller.remove(updateObject.id),
		});
		cache.receipts.update(trpcContext, {
			get: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				controller.update(currDebt.receiptId, (receipt) => {
					if (
						!receipt.debt ||
						receipt.debt.direction === "outcoming" ||
						receipt.debt.type === "foreign"
					) {
						return receipt;
					}
					return {
						...receipt,
						debt:
							currDebt.syncStatus.type === "nosync"
								? undefined
								: {
										direction: "incoming",
										type: "foreign",
										id: receipt.debt.id,
								  },
					};
				});
			},
			getNonResolvedAmount: noop,
			getPaged: noop,
			getName: noop,
			getResolvedParticipants: noop,
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
