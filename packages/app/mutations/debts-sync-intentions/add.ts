import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { SyncStatus } from "next-app/handlers/debts-sync-intentions/utils";

type Debt = TRPCQueryOutput<"debts.get">;

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.add",
	Debt
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) =>
		cache.debtsSyncIntentions.updateRevert(trpcContext, {
			getAll: (controller) =>
				controller.outbound.add({
					id: updateObject.id,
					userId: currDebt.userId,
					amount: currDebt.amount,
					currencyCode: currDebt.currencyCode,
					timestamp: currDebt.timestamp,
					// This will be updated in onSuccess
					intentionTimestamp: new Date(),
					note: currDebt.note,
					receiptId: currDebt.receiptId,
				}),
		}),
	onSuccess: (trpcContext, currDebt) => (intentionTimestamp, updateObject) => {
		const syncStatus = {
			type: "unsync",
			intention: {
				direction: "self",
				timestamp: intentionTimestamp,
			},
		} satisfies SyncStatus;
		cache.debtsSyncIntentions.update(trpcContext, {
			getAll: (controller) =>
				controller.outbound.update(updateObject.id, (intention) => ({
					...intention,
					intentionTimestamp,
				})),
		});
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
			getReceipt: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				return controller.update(
					currDebt.receiptId,
					currDebt.userId,
					(debt) => ({ ...debt, syncStatus }),
				);
			},
		});
	},
	mutateToastOptions: {
		text: "Sending debt..",
	},
	successToastOptions: {
		text: "Debt sent",
	},
	errorToastOptions: () => (error) => ({
		text: `Error sending debt: ${error.message}`,
	}),
};
