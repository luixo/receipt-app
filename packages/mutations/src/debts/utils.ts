import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { DebtsId, ReceiptsId, UsersId } from "~db/models";

import type { updateRevert as updateRevertDebts } from "../cache/debts";
import { update as updateDebts } from "../cache/debts";
import { update as updateReceipts } from "../cache/receipts";
import type {
	ControllerContext,
	SnapshotFn,
	UpdateFn,
	UpdaterRevertResult,
} from "../types";
import { mergeUpdaterResults } from "../utils";

type Intention = TRPCQueryOutput<"debts.getIntentions">[number];
export default Intention;

export const updateGetByUsers = (
	controller: Parameters<
		NonNullable<Parameters<typeof updateRevertDebts>[1]["getByUsers"]>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(acc, { current, userId, amount, currencyCode }) => [
				...acc,
				current
					? controller.updateCurrency(
							userId,
							current.currencyCode,
							(sum) => sum - current.amount,
							(snapshot) => () => snapshot,
					  )
					: undefined,
				controller.updateCurrency(
					userId,
					currencyCode,
					(sum) => sum + amount,
					(snapshot) => () => snapshot,
				),
			],
			[],
		),
	);

export const updateGetByUserId = (
	controller: Parameters<
		NonNullable<Parameters<typeof updateRevertDebts>[1]["getIdsByUser"]>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(acc, { id, current, userId, timestamp }) => [
				...acc,
				current
					? controller.update(
							userId,
							id,
							(debt) =>
								timestamp === debt.timestamp
									? debt
									: {
											...debt,
											timestamp,
									  },
							(snapshot) => (debt) =>
								snapshot.timestamp === debt.timestamp
									? debt
									: {
											...debt,
											timestamp: snapshot.timestamp,
									  },
					  )
					: controller.add(userId, {
							id,
							timestamp,
					  }),
			],
			[],
		),
	);

export const updateGet = (
	controller: Parameters<
		NonNullable<Parameters<typeof updateRevertDebts>[1]["get"]>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(
				acc,
				{
					id,
					current,
					userId,
					currencyCode,
					amount,
					timestamp,
					lockedTimestamp,
					note,
					receiptId,
				},
			) => [
				...acc,
				current
					? controller.update(
							id,
							(debt) => ({
								...debt,
								currencyCode,
								amount,
								timestamp,
								lockedTimestamp,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								lockedTimestamp: snapshot.lockedTimestamp,
							}),
					  )
					: controller.add({
							id,
							userId,
							currencyCode,
							amount,
							timestamp,
							note,
							lockedTimestamp,
							their: { lockedTimestamp, timestamp, amount, currencyCode },
							receiptId,
					  }),
			],
			[],
		),
	);

export type CurrentDebt = {
	userId: UsersId;
	amount: number;
	currencyCode: CurrencyCode;
	receiptId?: ReceiptsId;
	lockedTimestamp?: Date | undefined;
	their?: {
		lockedTimestamp: Date | undefined;
	};
};

type DebtSum = number;
type DebtByUserIdSnapshot = TRPCQueryOutput<"debts.getIdsByUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type DebtUpdateObject = TRPCMutationInput<"debts.update">["update"];

export const getNextLockedTimestamp = (update: DebtUpdateObject) =>
	update.amount !== undefined ||
	update.timestamp !== undefined ||
	update.currencyCode !== undefined ||
	update.locked === true
		? // lockedTimestamp will be overriden in onSuccess
		  new Date()
		: update.locked === false
		? null
		: undefined;

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
		const nextLockedTimestamp = getNextLockedTimestamp(update);
		if (nextLockedTimestamp !== null) {
			nextDebt.lockedTimestamp = nextLockedTimestamp;
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
		const nextLockedTimestamp = getNextLockedTimestamp(update);
		if (nextLockedTimestamp !== null) {
			revertDebt.lockedTimestamp = snapshot.lockedTimestamp;
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
		getNonResolvedAmount: undefined,
		getPaged: undefined,
	});
};

export const updateLockedTimestamps = (
	controllerContext: ControllerContext,
	currDebt: CurrentDebt,
	debtId: DebtsId,
	lockedTimestamp: Date | undefined,
	reverseLockedTimestampUpdated: boolean,
) => {
	updateDebts(controllerContext, {
		getByUsers: (controller) => {
			if (lockedTimestamp === undefined) {
				if (
					currDebt.lockedTimestamp !== undefined &&
					!(
						currDebt.lockedTimestamp.valueOf() ===
						currDebt.their?.lockedTimestamp?.valueOf()
					)
				) {
					// We turned off syncing by setting lockedTimestamp to null
					// Hence previously unsynced debt does not count now
					controller.updateUnsyncedDebts(
						currDebt.userId,
						(amount) => amount - 1,
					);
				}
			} else if (!reverseLockedTimestampUpdated) {
				// We updated something meaninful (lockedTimestamp changed) and reverse was not accepted
				// Hence previously synced debt is now unsynced
				controller.updateUnsyncedDebts(currDebt.userId, (amount) => amount + 1);
			}
		},
		getIdsByUser: undefined,
		get: (controller) =>
			controller.update(debtId, (debt) => ({
				...debt,
				lockedTimestamp,
				their: reverseLockedTimestampUpdated
					? {
							amount: debt.amount,
							currencyCode: debt.currencyCode,
							timestamp: debt.timestamp,
							lockedTimestamp,
					  }
					: debt.their,
			})),
		getIntentions: (controller) => {
			if (!lockedTimestamp) {
				return;
			}
			// It seems like it doesn't work
			// because whenever we update lockedTimestmap it is more fresh than counteryparty's
			// hence we never get intentions actually updated here
			controller.invalidate();
		},
	});
};
