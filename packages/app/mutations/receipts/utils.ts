import { cache } from "app/cache";
import { TRPCMutationOutput, TRPCReactContext } from "app/trpc";
import { noop } from "app/utils/utils";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptCacheOnDebtUpdate = (
	trpcContext: TRPCReactContext,
	receiptId: ReceiptsId,
	receiptTimestamp: Date,
	updatedDebts: (TRPCMutationOutput<"receipts.updateDebt"> & {
		deltaAmount: number;
	})[],
) => {
	cache.receipts.update(trpcContext, {
		get: (controller) => {
			controller.update(receiptId, (receipt) => ({
				...receipt,
				debt: {
					direction: "outcoming",
					ids: updatedDebts.map(({ debtId }) => debtId),
				},
			}));
		},
		getNonResolvedAmount: noop,
		getPaged: noop,
		getName: noop,
		getResolvedParticipants: noop,
	});
	updatedDebts.forEach((updatedDebt) => {
		const updatedPartial = {
			currencyCode: updatedDebt.currencyCode,
			timestamp: updatedDebt.timestamp,
			amount: updatedDebt.amount,
			locked: true,
			receiptId,
			lockedTimestamp: receiptTimestamp,
		};
		if (updatedDebt.updated) {
			return cache.debts.update(trpcContext, {
				get: (controller) =>
					controller.update(updatedDebt.debtId, (debt) => ({
						...debt,
						...updatedPartial,
					})),
				getUser: (controller) =>
					controller.update(updatedDebt.userId, updatedDebt.debtId, (debt) => ({
						...debt,
						...updatedPartial,
					})),
				getByUsers: (controller) =>
					controller.update(
						updatedDebt.userId,
						updatedDebt.currencyCode,
						(sum) => sum + updatedDebt.deltaAmount,
					),
				getIntentions: (controller) => controller.remove(updatedDebt.debtId),
			});
		}
		return cache.debts.update(trpcContext, {
			get: (controller) =>
				controller.add({
					id: updatedDebt.debtId,
					userId: updatedDebt.userId,
					note: updatedDebt.note,
					their: undefined,
					...updatedPartial,
				}),
			getUser: (controller) =>
				controller.add(updatedDebt.userId, {
					id: updatedDebt.debtId,
					created: updatedDebt.created,
					note: updatedDebt.note,
					their: undefined,
					...updatedPartial,
				}),
			getByUsers: (controller) =>
				controller.update(
					updatedDebt.userId,
					updatedDebt.currencyCode,
					(sum) => sum + updatedDebt.amount,
				),
			getIntentions: (controller) => controller.remove(updatedDebt.debtId),
		});
	});
};
