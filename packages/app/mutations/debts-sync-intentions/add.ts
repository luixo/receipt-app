import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";

type Debt = TRPCQueryOutput<"debts.get">;

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.add",
	void,
	Debt
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) => {
		cache.debtsSyncIntentions.getAll.outbound.add(trpcContext, {
			id: updateObject.id,
			userId: currDebt.userId,
			amount: currDebt.amount,
			currency: currDebt.currency,
			timestamp: currDebt.timestamp,
			intentionTimestamp: new Date(),
			note: currDebt.note,
		});
	},
	onSuccess: (trpcContext, currDebt) => (intentionTimestamp, updateObject) => {
		cache.debtsSyncIntentions.getAll.outbound.update(
			trpcContext,
			updateObject.id,
			(intention) => ({ ...intention, intentionTimestamp })
		);
		cache.debts.get.update(trpcContext, updateObject.id, (debt) => ({
			...debt,
			status: "unsync",
			intentionDirection: "self",
		}));
		cache.debts.getByReceiptId.update(trpcContext, updateObject.id, (debt) => ({
			...debt,
			status: "unsync",
			intentionDirection: "self",
		}));
		cache.debts.getUser.update(
			trpcContext,
			currDebt.userId,
			updateObject.id,
			(debt) => ({ ...debt, status: "unsync", intentionDirection: "self" })
		);
	},
	onError: (trpcContext) => (_error, updateObject) => {
		cache.debtsSyncIntentions.getAll.outbound.remove(
			trpcContext,
			updateObject.id
		);
	},
};
