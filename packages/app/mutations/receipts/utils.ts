import { cache } from "app/cache";
import { TRPCMutationOutput, TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptCacheOnDebtUpdate = (
	trpcContext: TRPCReactContext,
	receiptId: ReceiptsId,
	updatedDebts: (TRPCMutationOutput<"receipts.updateDebt"> & {
		deltaAmount: number;
	})[],
	updateIntention?: boolean
) => {
	const statusUpdate = {
		status: "unsync" as const,
		intentionDirection: updateIntention ? ("self" as const) : undefined,
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
				getReceipt: (controller) =>
					controller.update(receiptId, updatedDebt.userId, (participant) => ({
						...participant,
						...statusUpdate,
						synced: true,
					})),
				get: (controller) =>
					controller.update(updatedDebt.debtId, (debt) => ({
						...debt,
						...updatedPartial,
						...statusUpdate,
					})),
				getByReceiptId: (controller) =>
					controller.update(receiptId, (debt) => ({
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
						(sum) => sum + updatedDebt.deltaAmount
					),
			});
		}
		return cache.debts.update(trpcContext, {
			getReceipt: (controller) =>
				controller.upsert(
					receiptId,
					(participant) => ({ ...participant, ...statusUpdate, synced: true }),
					{
						debtId: updatedDebt.debtId,
						userId: updatedDebt.userId,
						...statusUpdate,
						synced: true,
						amount: updatedDebt.amount,
					}
				),
			get: (controller) =>
				controller.add({
					id: updatedDebt.debtId,
					userId: updatedDebt.userId,
					note: updatedDebt.note,
					...updatedPartial,
					...statusUpdate,
				}),
			getByReceiptId: (controller) =>
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
					(sum) => sum + updatedDebt.amount
				),
		});
	});
};
