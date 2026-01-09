import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { DebtId, ReceiptId, UserId } from "~db/ids";
import { type Temporal, getNow } from "~utils/date";

import { update as updateDebts } from "../cache/debts";
import { update as updateReceipts } from "../cache/receipts";
import type { ControllerContext, SnapshotFn, UpdateFn } from "../types";

type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type DebtUpdateObject = TRPCMutationInput<"debts.update">["update"];

const isUpdateSyncable = (update: DebtUpdateObject) =>
	Boolean(
		update.amount !== undefined ||
		update.timestamp !== undefined ||
		update.currencyCode !== undefined,
	);

export const applySumUpdate =
	(prevAmount: number, update: DebtUpdateObject): UpdateFn<number> =>
	(sum) => {
		if (update.amount !== undefined) {
			const delta = update.amount - prevAmount;
			return sum + delta;
		}
		return sum;
	};

export const applyUpdate =
	(update: DebtUpdateObject): UpdateFn<DebtSnapshot> =>
	(debt) => {
		const nextDebt = { ...debt };
		if (update.amount !== undefined) {
			nextDebt.amount = update.amount;
		}
		if (update.timestamp !== undefined) {
			nextDebt.timestamp = update.timestamp;
		}
		if (update.currencyCode !== undefined) {
			nextDebt.currencyCode = update.currencyCode;
		}
		if (update.note !== undefined) {
			nextDebt.note = update.note;
		}
		const updateSyncable = isUpdateSyncable(update);
		if (updateSyncable) {
			nextDebt.updatedAt = getNow.zonedDateTime();
		}
		return nextDebt;
	};

export const getSumRevert =
	(prevAmount: number, update: DebtUpdateObject): SnapshotFn<number> =>
	(updatedSum) =>
	(currentSum) => {
		if (update.amount !== undefined) {
			const delta = updatedSum - prevAmount;
			return currentSum - delta;
		}
		return currentSum;
	};

export const getRevert =
	(update: DebtUpdateObject): SnapshotFn<DebtSnapshot> =>
	(snapshot) =>
	(debt) => {
		const revertDebt = { ...debt };
		if (update.amount !== undefined) {
			revertDebt.amount = snapshot.amount;
		}
		if (update.timestamp !== undefined) {
			revertDebt.timestamp = snapshot.timestamp;
		}
		if (update.currencyCode !== undefined) {
			revertDebt.currencyCode = snapshot.currencyCode;
		}
		if (update.note !== undefined) {
			revertDebt.note = snapshot.note;
		}
		const wasUpdateSyncable = isUpdateSyncable(update);
		if (wasUpdateSyncable) {
			revertDebt.updatedAt = snapshot.updatedAt;
		}
		return revertDebt;
	};

export const updateReceiptWithOutcomingDebtId = (
	controllerContext: ControllerContext,
	receiptId: ReceiptId,
	userId: UserId,
	debtId: DebtId,
) => {
	updateReceipts(controllerContext, {
		get: (controller) => {
			controller.update(receiptId, (receipt) => ({
				...receipt,
				debts: {
					direction: "outcoming",
					debts:
						receipt.debts.direction === "outcoming"
							? receipt.debts.debts.some((debt) => debt.id === debtId)
								? receipt.debts.debts
								: [...receipt.debts.debts, { id: debtId, userId }]
							: [{ id: debtId, userId }],
				},
			}));
		},
		getPaged: undefined,
	});
};

export const updateUpdatedAt = (
	controllerContext: ControllerContext,
	debtId: DebtId,
	updatedAt: Temporal.ZonedDateTime | undefined,
	reverseUpdated: boolean | undefined,
) => {
	updateDebts(controllerContext, {
		getAll: undefined,
		getAllUser: undefined,
		getUsersPaged: undefined,
		getByUserPaged: undefined,
		get: (controller) => {
			controller.update(debtId, (debt) => ({
				...debt,
				updatedAt: updatedAt || debt.updatedAt,
				their: reverseUpdated
					? {
							amount: debt.amount,
							currencyCode: debt.currencyCode,
							timestamp: debt.timestamp,
							updatedAt: updatedAt || debt.updatedAt,
						}
					: debt.their,
			}));
		},
		getIntentions: (controller) => {
			// It seems like it doesn't work
			// because whenever we update lockedTimestmap it is more fresh than counteryparty's
			// hence we never get intentions actually updated here
			controller.invalidate();
		},
	});
};
