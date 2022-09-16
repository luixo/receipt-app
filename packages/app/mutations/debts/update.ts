import { cache } from "app/cache";
import { SnapshotFn, UpdateFn } from "app/cache/utils";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { noop } from "app/utils/utils";
import { ReceiptsId, UsersId } from "next-app/db/models";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const applySumUpdate =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"]
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
			case "currency":
				return sum;
		}
	};

const applyUserUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"]
	): UpdateFn<DebtUserSnapshot> =>
	(item) => {
		switch (update.type) {
			case "amount":
				return { ...item, amount: update.amount };
			case "timestamp":
				return { ...item, timestamp: update.timestamp };
			case "note":
				return { ...item, note: update.note };
			case "currency":
				return { ...item, currency: update.currency };
			case "locked":
				if (!update.value) {
					return {
						...item,
						locked: update.value,
						status: item.status === "sync" ? "unsync" : item.status,
					};
				}
				return { ...item, locked: update.value };
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"]
	): UpdateFn<DebtSnapshot> =>
	(item) => {
		switch (update.type) {
			case "amount":
				return { ...item, amount: update.amount };
			case "timestamp":
				return { ...item, timestamp: update.timestamp };
			case "note":
				return { ...item, note: update.note };
			case "currency":
				return { ...item, currency: update.currency };
			case "locked":
				if (!update.value) {
					return {
						...item,
						locked: update.value,
						status: item.status === "sync" ? "unsync" : item.status,
					};
				}
				return { ...item, locked: update.value };
		}
	};

const getSumRevert =
	(
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"]
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
			case "currency":
			case "locked":
				return currentSum;
		}
	};

const getUserRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"]
	): SnapshotFn<DebtUserSnapshot> =>
	(snapshot) =>
	(debt) => {
		switch (update.type) {
			case "amount":
				return { ...debt, amount: snapshot.amount };
			case "timestamp":
				return { ...debt, timestamp: snapshot.timestamp };
			case "note":
				return { ...debt, note: snapshot.note };
			case "currency":
				return { ...debt, currency: snapshot.currency };
			case "locked":
				if (!update.value) {
					return {
						...debt,
						locked: snapshot.locked,
						status: snapshot.status,
					};
				}
				return { ...debt, locked: snapshot.locked };
		}
	};

const getRevert =
	(
		update: TRPCMutationInput<"debts.update">["update"]
	): SnapshotFn<DebtSnapshot> =>
	(snapshot) =>
	(debt) => {
		switch (update.type) {
			case "amount":
				return { ...debt, amount: snapshot.amount };
			case "timestamp":
				return { ...debt, timestamp: snapshot.timestamp };
			case "note":
				return { ...debt, note: snapshot.note };
			case "currency":
				return { ...debt, currency: snapshot.currency };
			case "locked":
				if (!update.value) {
					return {
						...debt,
						locked: snapshot.locked,
						status: snapshot.status,
					};
				}
				return { ...debt, locked: snapshot.locked };
		}
	};

export const options: UseContextedMutationOptions<
	"debts.update",
	{
		userId: UsersId;
		amount: number;
		currency: Currency;
		receiptId: ReceiptsId | null;
	}
> = {
	onMutate: (trpcContext, currData) => (updateObject) => ({
		revertFns: cache.debts.updateRevert(trpcContext, {
			getByReceiptId: (controller) => {
				if (!currData.receiptId) {
					return;
				}
				return controller.update(
					currData.receiptId,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update)
				);
			},
			getByUsers: (controller) =>
				controller.update(
					currData.userId,
					currData.currency,
					applySumUpdate(currData.amount, updateObject.update),
					getSumRevert(currData.amount, updateObject.update)
				),
			getUser: (controller) =>
				controller.update(
					currData.userId,
					updateObject.id,
					applyUserUpdate(updateObject.update),
					getUserRevert(updateObject.update)
				),
			get: (controller) =>
				controller.update(
					updateObject.id,
					applyUpdate(updateObject.update),
					getRevert(updateObject.update)
				),
			getReceipt: noop,
		}),
	}),
	onSuccess: (trpcContext, currData) => (nextSyncData, updateObject) => {
		if (updateObject.update.type !== "locked") {
			return;
		}
		if (updateObject.update.value && nextSyncData) {
			const [status, intentionDirection] = nextSyncData;
			cache.debts.update(trpcContext, {
				getByReceiptId: (controller) => {
					if (!currData.receiptId) {
						return;
					}
					return controller.update(currData.receiptId, (debt) => ({
						...debt,
						status,
						intentionDirection,
					}));
				},
				// Sum is already update in onMutate
				getByUsers: noop,
				getUser: (controller) => {
					controller.update(currData.userId, updateObject.id, (debt) => ({
						...debt,
						status,
						intentionDirection,
					}));
				},
				get: (controller) =>
					controller.update(updateObject.id, (debt) => ({
						...debt,
						status,
						intentionDirection,
					})),
				getReceipt: (controller) => {
					if (!currData.receiptId) {
						return;
					}
					return controller.update(
						currData.receiptId,
						currData.userId,
						(debt) => ({ ...debt, status, intentionDirection, synced: false })
					);
				},
			});
		}
	},
};
