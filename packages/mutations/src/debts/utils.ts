import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { DebtsId, ReceiptsId, UsersId } from "~db/models";

import { update as updateDebts } from "../cache/debts";
import { update as updateReceipts } from "../cache/receipts";
import type { ControllerContext, SnapshotFn, UpdateFn } from "../types";

export type CurrentDebt = {
	userId: UsersId;
	amount: number;
	currencyCode: CurrencyCode;
	receiptId?: ReceiptsId;
	updatedAt: Date;
	their?: {
		updatedAt: Date;
	};
};

type DebtSum = number;
type DebtByUserIdSnapshot = TRPCQueryOutput<"debts.getIdsByUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type DebtUpdateObject = TRPCMutationInput<"debts.update">["update"];

const isUpdateSyncable = (update: DebtUpdateObject) =>
	Boolean(
		update.amount !== undefined ||
			update.timestamp !== undefined ||
			update.currencyCode !== undefined,
	);

export const applySumUpdate =
	(prevAmount: number, update: DebtUpdateObject): UpdateFn<DebtSum> =>
	(sum) => {
		if (update.amount !== undefined) {
			const delta = update.amount - prevAmount;
			return sum + delta;
		}
		return sum;
	};

export const applyByUserIdUpdate =
	(update: DebtUpdateObject): UpdateFn<DebtByUserIdSnapshot> =>
	(debt) => {
		if (update.timestamp !== undefined) {
			return { ...debt, timestamp: update.timestamp };
		}
		return debt;
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
			nextDebt.updatedAt = new Date();
		}
		return nextDebt;
	};

export const getSumRevert =
	(prevAmount: number, update: DebtUpdateObject): SnapshotFn<DebtSum> =>
	(updatedSum) =>
	(currentSum) => {
		if (update.amount !== undefined) {
			const delta = updatedSum - prevAmount;
			return currentSum - delta;
		}
		return currentSum;
	};

export const getByUserIdRevert =
	(update: DebtUpdateObject): SnapshotFn<DebtByUserIdSnapshot> =>
	(snapshot) =>
	(debt) => {
		if (update.timestamp !== undefined) {
			return { ...debt, timestamp: snapshot.timestamp };
		}
		return debt;
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
	receiptId: ReceiptsId,
	debtId: DebtsId,
) => {
	updateReceipts(controllerContext, {
		get: (controller) => {
			controller.update(receiptId, (receipt) => ({
				...receipt,
				debt: {
					direction: "outcoming",
					ids:
						receipt.debt.direction === "outcoming"
							? receipt.debt.ids.includes(debtId)
								? receipt.debt.ids
								: [...receipt.debt.ids, debtId]
							: [debtId],
				},
			}));
		},
		getPaged: undefined,
	});
};

export const updateUpdatedAt = (
	controllerContext: ControllerContext,
	debtId: DebtsId,
	updatedAt: Date | undefined,
	reverseUpdated: boolean | undefined,
) => {
	updateDebts(controllerContext, {
		getAll: undefined,
		getAllUser: undefined,
		getByUsers: undefined,
		getIdsByUser: undefined,
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
