import { cache } from "app/cache";
import { TRPCMutationOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptCacheOnDebtUpdate = (
	trpcContext: TRPCReactContext,
	receiptId: ReceiptsId,
	updatedDebts: TRPCMutationOutput<"receipts.updateDebt">[],
	updateIntention?: boolean
) => {
	const statusUpdate = {
		status: "unsync" as const,
		intentionDirection: updateIntention ? ("self" as const) : undefined,
	};
	updatedDebts.forEach((updatedDebt) => {
		const updatedPartial = {
			currency: updatedDebt.currency,
			timestamp: updatedDebt.timestamp,
			amount: updatedDebt.amount,
			locked: true,
			receiptId,
			...statusUpdate,
		};
		if (updatedDebt.updated) {
			cache.debts.getReceipt.update(
				trpcContext,
				receiptId,
				updatedDebt.userId,
				(participant) => ({
					...participant,
					...statusUpdate,
					synced: true,
				})
			);
			cache.debts.get.update(trpcContext, updatedDebt.debtId, (debt) => ({
				...debt,
				...updatedPartial,
				...statusUpdate,
			}));
			cache.debts.getByReceiptId.update(
				trpcContext,
				updatedDebt.debtId,
				(debt) => ({
					...debt,
					...updatedPartial,
					...statusUpdate,
				})
			);
			cache.debts.getUser.update(
				trpcContext,
				updatedDebt.userId,
				updatedDebt.debtId,
				(debt) => ({
					...debt,
					...updatedPartial,
					...statusUpdate,
				})
			);
		} else {
			cache.debts.getReceipt.add(trpcContext, receiptId, {
				debtId: updatedDebt.debtId,
				userId: updatedDebt.userId,
				...statusUpdate,
				synced: true,
			});
			cache.debts.get.add(trpcContext, {
				id: updatedDebt.debtId,
				userId: updatedDebt.userId,
				note: updatedDebt.note,
				...updatedPartial,
				...statusUpdate,
			});
			cache.debts.getByReceiptId.add(trpcContext, {
				id: updatedDebt.debtId,
				userId: updatedDebt.userId,
				note: updatedDebt.note,
				...updatedPartial,
				...statusUpdate,
			});
			cache.debts.getUser.add(trpcContext, updatedDebt.userId, {
				id: updatedDebt.debtId,
				created: updatedDebt.created,
				note: updatedDebt.note,
				...updatedPartial,
				...statusUpdate,
			});
		}
		cache.debts.getByUsers.invalidate(trpcContext);
	});
};
