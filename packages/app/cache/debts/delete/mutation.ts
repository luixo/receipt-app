import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";

export const mutationOptions: UseContextedMutationOptions<
	"debts.delete",
	{ sumRevert?: Revert<number> },
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (trpcContext, currDebt) => () => {
		const updatedSum = cache.debts.getByUsers.update(
			trpcContext,
			currDebt.userId,
			currDebt.currency,
			(sum) => sum - currDebt.amount
		);
		return {
			sumRevert:
				updatedSum !== undefined ? (sum) => sum + currDebt.amount : undefined,
		};
	},
	onSuccess: (trpcContext, currDebt) => (_result, updateObject) => {
		cache.debts.getReceipt.broad.removeByDebtId(
			trpcContext,
			currDebt.userId,
			updateObject.id
		);
		cache.debts.getUser.remove(trpcContext, currDebt.userId, updateObject.id);
		cache.debts.get.remove(trpcContext, updateObject.id);
		cache.debts.getByReceiptId.remove(trpcContext);
	},
	onError:
		(trpcContext, currDebt) =>
		(_error, variables, { sumRevert } = {}) => {
			if (sumRevert) {
				cache.debts.getByUsers.update(
					trpcContext,
					currDebt.userId,
					variables.id,
					sumRevert
				);
			}
		},
};
