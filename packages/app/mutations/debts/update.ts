import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { CurrencyCode } from "app/utils/currency";
import { noop } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const applySumUpdate =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtSum> =>
	(sum) => {
		switch (update.type) {
			case "amount": {
				const delta = update.amount - prevAmount;
				return sum + delta;
			}
			case "locked":
			case "timestamp":
			case "note":
			case "currencyCode":
				return sum;
		}
	};

const applyUserUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtUserSnapshot> =>
	(item) => {
		// lockedTimestamp will be overriden in onSuccess
		const nextLockedTimestamp =
			item.lockedTimestamp === undefined ? undefined : new Date();
		switch (update.type) {
			case "amount":
				return {
					...item,
					amount: update.amount,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "timestamp":
				return {
					...item,
					timestamp: update.timestamp,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "note":
				return { ...item, note: update.note };
			case "currencyCode":
				return {
					...item,
					currencyCode: update.currencyCode,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "locked":
				return {
					...item,
					lockedTimestamp: update.locked ? new Date() : undefined,
				};
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtSnapshot> =>
	(item) => {
		// lockedTimestamp will be overriden in onSuccess
		const nextLockedTimestamp =
			item.lockedTimestamp === undefined ? undefined : new Date();
		switch (update.type) {
			case "amount":
				return {
					...item,
					amount: update.amount,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "timestamp":
				return {
					...item,
					timestamp: update.timestamp,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "note":
				return { ...item, note: update.note };
			case "currencyCode":
				return {
					...item,
					currencyCode: update.currencyCode,
					lockedTimestamp: nextLockedTimestamp,
				};
			case "locked":
				return {
					...item,
					lockedTimestamp: update.locked ? new Date() : undefined,
				};
		}
	};

const getSumRevert =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtSum> =>
	(updatedSum) =>
	(currentSum) => {
		switch (update.type) {
			case "amount": {
				const delta = updatedSum - prevAmount;
				return currentSum - delta;
			}
			case "timestamp":
			case "note":
			case "currencyCode":
			case "locked":
				return currentSum;
		}
	};

const getUserRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtUserSnapshot> =>
	(snapshot) =>
	(debt) => {
		switch (update.type) {
			case "amount":
				return {
					...debt,
					amount: snapshot.amount,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "timestamp":
				return {
					...debt,
					timestamp: snapshot.timestamp,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "note":
				return { ...debt, note: snapshot.note };
			case "currencyCode":
				return {
					...debt,
					currencyCode: snapshot.currencyCode,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "locked":
				return { ...debt, lockedTimestamp: snapshot.lockedTimestamp };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): SnapshotFn<DebtSnapshot> =>
	(snapshot) =>
	(debt) => {
		switch (update.type) {
			case "amount":
				return {
					...debt,
					amount: snapshot.amount,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "timestamp":
				return {
					...debt,
					timestamp: snapshot.timestamp,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "note":
				return { ...debt, note: snapshot.note };
			case "currencyCode":
				return {
					...debt,
					currencyCode: snapshot.currencyCode,
					lockedTimestamp: snapshot.lockedTimestamp,
				};
			case "locked":
				return { ...debt, lockedTimestamp: snapshot.lockedTimestamp };
		}
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
	onMutate: (trpcContext, currData) => (updateObject) =>
		cache.debts.updateRevert(trpcContext, {
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
				if (
					updateObject.update.type !== "locked" ||
					updateObject.update.locked
				) {
					return;
				}
				return controller.remove(updateObject.id);
			},
		}),
	onSuccess: (trpcContext, currData) => (result, updateObject) => {
		if (!result) {
			return;
		}
		const { lockedTimestamp } = result;
		cache.debts.update(trpcContext, {
			getByUsers: noop,
			getUser: (controller) =>
				controller.update(currData.userId, updateObject.id, (debt) => ({
					...debt,
					lockedTimestamp,
				})),
			get: (controller) =>
				controller.update(updateObject.id, (debt) => ({
					...debt,
					lockedTimestamp,
				})),
			getIntentions: (controller) => {
				if (
					updateObject.update.type !== "locked" ||
					!updateObject.update.locked
				) {
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
