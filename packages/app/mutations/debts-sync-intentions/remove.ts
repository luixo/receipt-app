import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { noop } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.remove",
	{ userId: UsersId; receiptId: ReceiptsId | null }
> = {
	onMutate: (trpcContext) => (updateObject) =>
		cache.debtsSyncIntentions.updateRevert(trpcContext, {
			getAll: (controller) => controller.outbound.remove(updateObject.id),
		}),
	onSuccess: (trpcContext, currData) => (syncStatus, updateObject) => {
		cache.debts.update(trpcContext, {
			getReceipt: (controller) => {
				if (!currData.receiptId) {
					return;
				}
				return controller.update(
					currData.receiptId,
					currData.userId,
					(debt) => ({ ...debt, syncStatus }),
				);
			},
			get: (controller) =>
				controller.update(updateObject.id, (debt) => ({
					...debt,
					syncStatus,
				})),
			getUser: (controller) =>
				controller.update(currData.userId, updateObject.id, (debt) => ({
					...debt,
					syncStatus,
				})),
			getByUsers: noop,
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error cancelling intention: ${error.message}`,
	}),
};
