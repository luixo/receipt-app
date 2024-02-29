import type { TRPCMutationInput, TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";
import type { DebtsId, ReceiptsId, UsersId } from "~web/db/models";

import * as cache from "../cache";
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
		NonNullable<
			Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["getByUsers"]
		>
	>[0],
	intentions: Intention[],
) =>
	mergeUpdaterResults(
		...intentions.reduce<(UpdaterRevertResult | undefined)[]>(
			(acc, { current, userId, amount, currencyCode }) => [
				...acc,
				current
					? controller.update(
							userId,
							current.currencyCode,
							(sum) => sum - current.amount,
							(snapshot) => () => snapshot,
					  )
					: undefined,
				controller.update(
					userId,
					currencyCode,
					(sum) => sum + amount,
					(snapshot) => () => snapshot,
				),
			],
			[],
		),
	);

export const updateGetUser = (
	controller: Parameters<
		NonNullable<
			Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["getUser"]
		>
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
					amount,
					currencyCode,
					timestamp,
					lockedTimestamp,
					note,
					receiptId,
				},
			) => [
				...acc,
				current
					? controller.update(
							userId,
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
					: controller.add(userId, {
							id,
							currencyCode,
							amount,
							timestamp,
							// Will be overriden on onSuccess
							created: new Date(),
							note,
							lockedTimestamp,
							their: { lockedTimestamp },
							receiptId,
					  }),
			],
			[],
		),
	);

export const updateGet = (
	controller: Parameters<
		NonNullable<Parameters<(typeof cache)["debts"]["updateRevert"]>[1]["get"]>
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

export const updateGetUserSuccess = (
	controller: Parameters<
		NonNullable<Parameters<(typeof cache)["debts"]["update"]>[1]["getUser"]>
	>[0],
	intentions: (Intention & { created: Date })[],
) => {
	intentions.forEach(({ id, userId, current, created }) => {
		if (!current) {
			return;
		}
		controller.update(userId, id, (debt) => ({ ...debt, created }));
	});
};

export type CurrentDebt = {
	userId: UsersId;
	amount: number;
	currencyCode: CurrencyCode;
	receiptId?: ReceiptsId;
};

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
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

export const applyUserUpdate =
	(update: DebtUpdateObject): UpdateFn<DebtUserSnapshot> =>
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

export const getUserRevert =
	(update: DebtUpdateObject): SnapshotFn<DebtUserSnapshot> =>
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
	cache.receipts.update(controllerContext, {
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
	userId: UsersId,
	debtId: DebtsId,
	lockedTimestamp: Date | undefined,
	reverseLockedTimestampUpdated: boolean,
) => {
	cache.debts.update(controllerContext, {
		getByUsers: undefined,
		getUser: (controller) =>
			controller.update(userId, debtId, (debt) => ({
				...debt,
				lockedTimestamp,
				their:
					reverseLockedTimestampUpdated && debt.their
						? {
								amount: debt.amount,
								currencyCode: debt.currencyCode,
								timestamp: debt.timestamp,
								lockedTimestamp,
						  }
						: debt.their,
			})),
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
