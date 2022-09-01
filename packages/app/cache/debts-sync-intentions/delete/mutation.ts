import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"debts-sync-intentions.delete",
	void,
	{ userId: UsersId }
> = {
	onSuccess:
		(trpcContext, currData) =>
		([status, intentionDirection], updateObject) => {
			cache.debts.getReceipt.broad.updateByDebtId(
				trpcContext,
				currData.userId,
				updateObject.id,
				(debt) => ({ ...debt, status, intentionDirection })
			);
			cache.debtsSyncIntentions.getAll.outbound.remove(
				trpcContext,
				updateObject.id
			);
			cache.debts.get.update(trpcContext, updateObject.id, (debt) => ({
				...debt,
				status,
				intentionDirection,
			}));
			cache.debts.getByReceiptId.update(
				trpcContext,
				updateObject.id,
				(debt) => ({
					...debt,
					status,
					intentionDirection,
				})
			);
			cache.debts.getUser.update(
				trpcContext,
				currData.userId,
				updateObject.id,
				(debt) => ({ ...debt, status, intentionDirection })
			);
		},
};
