import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { CurrencyCode } from "app/utils/currency";
import { DebtsId, ReceiptsId, UsersId } from "next-app/db/models";
import { SyncStatus } from "next-app/handlers/debts-sync-intentions/utils";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.accept",
	{
		debtId: DebtsId;
		userId: UsersId;
		currencyCode: CurrencyCode;
		currentAmount?: number;
		receiptId: ReceiptsId | null;
	}
> = {
	// TODO: move everything to onMutate as we have intention
	// Intention content all the data we actually need
	onSuccess: (trpcContext, context) => (result, updateObject) => {
		cache.debtsSyncIntentions.update(trpcContext, {
			getAll: (controller) => controller.inbound.remove(updateObject.id),
		});
		const syncStatus = { type: "sync" } satisfies SyncStatus;
		const { currentAmount } = context;
		if (currentAmount !== undefined) {
			cache.debts.update(trpcContext, {
				getByUsers: (controller) =>
					controller.update(
						context.userId,
						context.currencyCode,
						(sum) => sum + result.amount - currentAmount,
					),
				getUser: (controller) => {
					controller.update(context.userId, updateObject.id, (debt) => ({
						...debt,
						amount: result.amount,
						timestamp: result.timestamp,
						syncStatus,
					}));
				},
				get: (controller) =>
					controller.update(updateObject.id, (debt) => ({
						...debt,
						amount: result.amount,
						timestamp: result.timestamp,
						syncStatus,
					})),
			});
		} else {
			cache.debts.update(trpcContext, {
				getByUsers: (controller) =>
					controller.update(
						context.userId,
						context.currencyCode,
						(sum) => sum + result.amount,
					),
				getUser: (controller) =>
					controller.add(context.userId, {
						id: updateObject.id,
						currencyCode: context.currencyCode,
						amount: result.amount,
						timestamp: result.timestamp,
						created: result.created,
						note: result.note,
						locked: true,
						syncStatus,
						receiptId: result.receiptId,
					}),
				get: (controller) =>
					controller.add({
						id: updateObject.id,
						userId: context.userId,
						currencyCode: context.currencyCode,
						amount: result.amount,
						timestamp: result.timestamp,
						note: result.note,
						locked: true,
						syncStatus,
						receiptId: result.receiptId,
					}),
			});
		}
	},
	mutateToastOptions: {
		text: `Accepting debt..`,
	},
	successToastOptions: {
		text: `Debt accepted successfully`,
	},
	errorToastOptions: () => (error) => ({
		text: `Error accepting debt: ${error.message}`,
	}),
};
