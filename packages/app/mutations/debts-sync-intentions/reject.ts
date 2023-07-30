import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";
import { SyncStatus } from "next-app/handlers/debts-sync-intentions/utils";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.reject",
	{ userId: UsersId; currentAmount?: number; receiptId: ReceiptsId | null }
> = {
	onMutate: (trpcContext) => (updateObject) =>
		cache.debtsSyncIntentions.updateRevert(trpcContext, {
			getAll: (controller) => controller.inbound.remove(updateObject.id),
		}),
	onSuccess: (trpcContext, currDebt) => (_result, updateObject) => {
		const syncStatus = { type: "unsync" } satisfies SyncStatus;
		if (currDebt.currentAmount !== undefined) {
			cache.debts.update(trpcContext, {
				get: (controller) =>
					controller.update(updateObject.id, (debt) => ({
						...debt,
						syncStatus,
					})),
				getUser: (controller) =>
					controller.update(currDebt.userId, updateObject.id, (debt) => ({
						...debt,
						syncStatus,
					})),
				getByUsers: noop,
			});
		}
	},
	errorToastOptions: () => (error) => ({
		text: `Error rejecting debt: ${error.message}`,
	}),
};
