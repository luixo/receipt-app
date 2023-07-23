import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.reject",
	{ userId: UsersId; currentAmount?: number; receiptId: ReceiptsId | null }
> = {
	onMutate: (trpcContext) => (updateObject) =>
		cache.debtsSyncIntentions.updateRevert(trpcContext, {
			getAll: (controller) => controller.inbound.remove(updateObject.id),
		}),
	onSuccess: (trpcContext, currDebt) => (_result, updateObject) => {
		if (currDebt.currentAmount !== undefined) {
			cache.debts.update(trpcContext, {
				get: (controller) =>
					controller.update({ id: updateObject.id }, (debt) => ({
						...debt,
						status: "unsync",
						intentionDirection: undefined,
					})),
				getUser: (controller) =>
					controller.update(currDebt.userId, updateObject.id, (debt) => ({
						...debt,
						status: "unsync",
						intentionDirection: undefined,
					})),
				getByUsers: noop,
				getReceipt: (controller) => {
					if (!currDebt.receiptId) {
						return;
					}
					return controller.update(
						currDebt.receiptId,
						currDebt.userId,
						(debt) => ({
							...debt,
							status: "unsync",
							intentionDirection: undefined,
						}),
					);
				},
			});
		}
	},
	errorToastOptions: () => (error) => ({
		text: `Error rejecting debt: ${error.message}`,
	}),
};
