import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { Currency } from "app/utils/currency";
import { UsersId } from "next-app/db/models";

export const mutationOptions: UseContextedMutationOptions<
	"debts-sync-intentions.accept",
	void,
	{
		userId: UsersId;
		currency: Currency;
		currentAmount?: number;
	}
> = {
	onSuccess: (trpcContext, context) => (result, updateObject) => {
		cache.debtsSyncIntentions.getAll.inbound.remove(
			trpcContext,
			updateObject.id
		);
		const { currentAmount } = context;
		if (currentAmount !== undefined) {
			cache.debts.getByUsers.update(
				trpcContext,
				context.userId,
				context.currency,
				(sum) => sum + result.amount - currentAmount
			);
			cache.debts.getUser.update(
				trpcContext,
				context.userId,
				updateObject.id,
				(debt) => ({
					...debt,
					amount: result.amount,
					timestamp: result.timestamp,
					intentionDirection: undefined,
					status: "sync",
				})
			);
			cache.debts.get.update(trpcContext, updateObject.id, (debt) => ({
				...debt,
				amount: result.amount,
				timestamp: result.timestamp,
				intentionDirection: undefined,
				status: "sync",
			}));
		} else {
			cache.debts.getByUsers.update(
				trpcContext,
				context.userId,
				context.currency,
				(sum) => sum + result.amount
			);
			cache.debts.getUser.add(trpcContext, context.userId, {
				id: updateObject.id,
				currency: context.currency,
				amount: result.amount,
				timestamp: result.timestamp,
				created: result.created,
				note: result.note,
				locked: true,
				intentionDirection: undefined,
				status: "sync",
			});
			cache.debts.get.add(trpcContext, {
				id: updateObject.id,
				userId: context.userId,
				currency: context.currency,
				amount: result.amount,
				timestamp: result.timestamp,
				note: result.note,
				locked: true,
				intentionDirection: undefined,
				status: "sync",
			});
		}
	},
};
