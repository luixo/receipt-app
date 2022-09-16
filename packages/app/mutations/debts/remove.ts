import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";

export const options: UseContextedMutationOptions<
	"debts.remove",
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) => ({
		revertFns: cache.debts.updateRevert(trpcContext, {
			getByReceiptId: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				return controller.remove(currDebt.receiptId, updateObject.id);
			},
			getByUsers: (controller) =>
				controller.update(
					currDebt.userId,
					currDebt.currency,
					(sum) => sum - currDebt.amount,
					() => (sum) => sum + currDebt.amount
				),
			getUser: (controller) =>
				controller.remove(currDebt.userId, updateObject.id),
			// We remove the debt from everywhere else
			// but it's own page
			// otherwise the page will try to refetch the data immediately
			get: noop,
			getReceipt: (controller) => controller.remove(currDebt.userId),
		}),
	}),
	onSuccess: (trpcContext) => (_result, updateObject) => {
		cache.debts.update(trpcContext, {
			getByReceiptId: noop,
			getByUsers: noop,
			getUser: noop,
			get: (controller) => controller.remove(updateObject.id),
			getReceipt: noop,
		});
	},
};
