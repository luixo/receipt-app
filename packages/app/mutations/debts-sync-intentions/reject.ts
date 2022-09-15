import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.reject",
	void,
	{ userId: UsersId; currentAmount?: number }
> = {
	onSuccess: (trpcContext, context) => (_result, updateObject) => {
		cache.debtsSyncIntentions.getAll.inbound.remove(
			trpcContext,
			updateObject.id
		);
		if (context.currentAmount !== undefined) {
			cache.debts.getUser.update(
				trpcContext,
				context.userId,
				updateObject.id,
				(debt) => ({
					...debt,
					status: "unsync",
					intentionDirection: undefined,
				})
			);
			cache.debts.get.update(trpcContext, updateObject.id, (debt) => ({
				...debt,
				status: "unsync",
				intentionDirection: undefined,
			}));
			cache.debts.getByReceiptId.update(
				trpcContext,
				updateObject.id,
				(debt) => ({
					...debt,
					status: "unsync",
					intentionDirection: undefined,
				})
			);
		}
	},
};
