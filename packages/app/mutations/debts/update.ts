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
		switch (update.type) {
			case "amount":
				return { ...item, amount: update.amount };
			case "timestamp":
				return { ...item, timestamp: update.timestamp };
			case "note":
				return { ...item, note: update.note };
			case "currencyCode":
				return { ...item, currencyCode: update.currencyCode };
			case "locked":
				if (!update.value) {
					return {
						...item,
						locked: update.value,
						syncStatus:
							item.syncStatus.type === "sync"
								? { type: "unsync" }
								: item.syncStatus,
					};
				}
				return {
					...item,
					locked: update.value,
					syncStatus: {
						type: "unsync",
						intention: {
							direction: "self",
							// This will be overriden in onSuccess
							timestamp: new Date(),
						},
					},
				};
		}
	};

const applyUpdate =
	(
		update: TRPCMutationInput<"debts.update">["update"],
	): UpdateFn<DebtSnapshot> =>
	(item) => {
		switch (update.type) {
			case "amount":
				return { ...item, amount: update.amount };
			case "timestamp":
				return { ...item, timestamp: update.timestamp };
			case "note":
				return { ...item, note: update.note };
			case "currencyCode":
				return { ...item, currencyCode: update.currencyCode };
			case "locked":
				if (!update.value) {
					return {
						...item,
						locked: update.value,
						syncStatus:
							item.syncStatus.type === "sync"
								? { type: "unsync" }
								: item.syncStatus,
					};
				}
				return {
					...item,
					locked: update.value,
					syncStatus: {
						type: "unsync",
						intention: {
							direction: "self",
							// This will be overriden in onSuccess
							timestamp: new Date(),
						},
					},
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
				return { ...debt, amount: snapshot.amount };
			case "timestamp":
				return { ...debt, timestamp: snapshot.timestamp };
			case "note":
				return { ...debt, note: snapshot.note };
			case "currencyCode":
				return { ...debt, currencyCode: snapshot.currencyCode };
			case "locked":
				if (!update.value) {
					return {
						...debt,
						locked: snapshot.locked,
						syncStatus: snapshot.syncStatus,
					};
				}
				return {
					...debt,
					locked: snapshot.locked,
					syncStatus: snapshot.syncStatus,
				};
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
				return { ...debt, amount: snapshot.amount };
			case "timestamp":
				return { ...debt, timestamp: snapshot.timestamp };
			case "note":
				return { ...debt, note: snapshot.note };
			case "currencyCode":
				return { ...debt, currencyCode: snapshot.currencyCode };
			case "locked":
				if (!update.value) {
					return {
						...debt,
						locked: snapshot.locked,
						syncStatus: snapshot.syncStatus,
					};
				}
				return {
					...debt,
					locked: snapshot.locked,
					syncStatus: snapshot.syncStatus,
				};
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
		}),
	onSuccess: (trpcContext, currData) => (nextSyncStatus, updateObject) => {
		if (updateObject.update.type !== "locked") {
			return;
		}
		if (!nextSyncStatus) {
			throw new Error(
				"Expected to have syncStatuc when update type is `locked`",
			);
		}
		if (updateObject.update.value) {
			cache.debts.update(trpcContext, {
				// Sum is already update in onMutate
				getByUsers: noop,
				getUser: (controller) => {
					controller.update(currData.userId, updateObject.id, (debt) => ({
						...debt,
						syncStatus: nextSyncStatus,
					}));
				},
				get: (controller) =>
					controller.update(updateObject.id, (debt) => ({
						...debt,
						syncStatus: nextSyncStatus,
					})),
			});
		}
	},
	errorToastOptions: () => (error) => ({
		text: `Error updating debt: ${error.message}`,
	}),
};
