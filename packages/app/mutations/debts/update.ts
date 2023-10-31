import { cache } from "app/cache";
import type { SnapshotFn, UpdateFn } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";
import type { ReceiptsId, UsersId } from "next-app/db/models";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const applySumUpdate =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtSum> =>
	(sum) => {
		if (update.amount !== undefined) {
			const delta = update.amount - prevAmount;
			return sum + delta;
		}
		return sum;
	};

const getNextLockedTimestamp = (
	update: TRPCMutationInput<"debts.update">["update"],
) =>
	update.amount !== undefined ||
	update.timestamp !== undefined ||
	update.currencyCode !== undefined ||
	update.locked === true
		? // lockedTimestamp will be overriden in onSuccess
		  new Date()
		: update.locked === false
		? null
		: undefined;

const applyUserUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtUserSnapshot> =>
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

const applyUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtSnapshot> =>
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

const getSumRevert =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtSum> =>
	(updatedSum) =>
	(currentSum) => {
		if (update.amount !== undefined) {
			const delta = updatedSum - prevAmount;
			return currentSum - delta;
		}
		return currentSum;
	};

const getUserRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtUserSnapshot> =>
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

const getRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtSnapshot> =>
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

export const options: UseContextedMutationOptions<
	"debts.update",
	{
		userId: UsersId;
		amount: number;
		currencyCode: CurrencyCode;
		receiptId: ReceiptsId | null;
	}
> = {
	onMutate: (controllerContext, currData) => (updateObject) =>
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) =>
				controller.update(
					currData.userId,
					currData.currencyCode,
					applySumUpdate(currData.amount, updateObject.update),
					getSumRevert(currData.amount, updateObject.update),
				),
			getUser: (controller) =>
				controller.update(
					currData.userId,
					updateObject.id,
					applyUserUpdate(updateObject.update),
					getUserRevert(updateObject.update),
				),
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update),
				),
			getIntentions: (controller) => {
				const nextLockedTimestamp = getNextLockedTimestamp(updateObject.update);
				if (!nextLockedTimestamp) {
					return;
				}
				return controller.remove(updateObject.id);
			},
		}),
	onSuccess: (controllerContext, currData) => (result, updateObject) => {
		// lockedTimestamp is undefined (in contrary to being null)
		// hence we didn't update it in this transaction and we should update nothing in cache
		if (result.lockedTimestamp === undefined) {
			return;
		}
		const lockedTimestamp = result.lockedTimestamp || undefined;
		const { reverseLockedTimestampUpdated } = result;
		cache.debts.update(controllerContext, {
			getByUsers: undefined,
			getUser: (controller) =>
				controller.update(currData.userId, updateObject.id, (debt) => ({
					...debt,
					lockedTimestamp,
					their: reverseLockedTimestampUpdated
						? { lockedTimestamp }
						: debt.their,
				})),
			get: (controller) =>
				controller.update(updateObject.id, (debt) => ({
					...debt,
					lockedTimestamp,
					their: reverseLockedTimestampUpdated
						? { lockedTimestamp }
						: debt.their,
				})),
			getIntentions: (controller) => {
				const nextLockedTimestamp = getNextLockedTimestamp(updateObject.update);
				if (!nextLockedTimestamp) {
					return;
				}
				// It seems like it doesn't work
				// because whenever we update lockedTimestmap it is more fresh than counteryparty's
				// hence we never get intentions actually updated here
				controller.invalidate();
			},
		});
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating debt: ${error.message}`,
	}),
};
