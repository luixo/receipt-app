import { cache } from "app/cache";
import { TRPCMutationOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";
import { SyncStatus } from "next-app/handlers/debts-sync-intentions/utils";

export const updateReceiptCacheOnDebtUpdate = (
	trpcContext: TRPCReactContext,
	receiptId: ReceiptsId,
	receiptTimestamp: Date,
	updatedDebts: (TRPCMutationOutput<"receipts.updateDebt"> & {
		deltaAmount: number;
	})[],
	updateIntention?: boolean,
) => {
	const statusUpdate = {
		syncStatus: {
			type: "unsync",
			intention: updateIntention
				? { direction: "self", timestamp: receiptTimestamp }
				: undefined,
		} satisfies SyncStatus,
	};
	updatedDebts.forEach((updatedDebt) => {
		const updatedPartial = {
			currencyCode: updatedDebt.currencyCode,
			timestamp: updatedDebt.timestamp,
			amount: updatedDebt.amount,
			locked: true,
			receiptId,
			...statusUpdate,
		};
		if (updatedDebt.updated) {
			return cache.debts.update(trpcContext, {
				get: (controller) =>
					controller.update(updatedDebt.debtId, (debt) => ({
						...debt,
						...updatedPartial,
						...statusUpdate,
					})),
				getUser: (controller) =>
					controller.update(updatedDebt.userId, updatedDebt.debtId, (debt) => ({
						...debt,
						...updatedPartial,
						...statusUpdate,
					})),
				getByUsers: (controller) =>
					controller.update(
						updatedDebt.userId,
						updatedDebt.currencyCode,
						(sum) => sum + updatedDebt.deltaAmount,
					),
			});
		}
		return cache.debts.update(trpcContext, {
			get: (controller) =>
				controller.add({
					id: updatedDebt.debtId,
					userId: updatedDebt.userId,
					note: updatedDebt.note,
					...updatedPartial,
					...statusUpdate,
				}),
			getUser: (controller) =>
				controller.add(updatedDebt.userId, {
					id: updatedDebt.debtId,
					created: updatedDebt.created,
					note: updatedDebt.note,
					...updatedPartial,
					...statusUpdate,
				}),
			getByUsers: (controller) =>
				controller.update(
					updatedDebt.userId,
					updatedDebt.currencyCode,
					(sum) => sum + updatedDebt.amount,
				),
		});
	});
};
