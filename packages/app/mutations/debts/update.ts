import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";
import { UsersId } from "next-app/db/models";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const applySumUpdate = (
	sum: number,
	prevAmount: number,
	update: TRPCMutationInput<"debts.update">["update"]
): DebtSum => {
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

const applyUserUpdate = (
	item: DebtUserSnapshot,
	update: TRPCMutationInput<"debts.update">["update"]
): DebtUserSnapshot => {
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
			return { ...item, locked: update.value };
	}
};

const applyUpdate = (
	item: DebtSnapshot,
	update: TRPCMutationInput<"debts.update">["update"]
): DebtSnapshot => {
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
			return { ...item, locked: update.value };
	}
};

const getSumRevert =
	(
		updatedSum: DebtSum,
		prevAmount: number,
		update: TRPCMutationInput<"debts.update">["update"]
	): Revert<DebtSum> =>
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
		snapshot: DebtUserSnapshot,
		update: TRPCMutationInput<"debts.update">["update"]
	): Revert<DebtUserSnapshot> =>
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
				return { ...debt, locked: snapshot.locked };
		}
	};

const getRevert =
	(
		snapshot: DebtSnapshot,
		update: TRPCMutationInput<"debts.update">["update"]
	): Revert<DebtSnapshot> =>
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
				return { ...debt, locked: snapshot.locked };
		}
	};

export const options: UseContextedMutationOptions<
	"debts.update",
	{
		sumRevert?: Revert<DebtSum>;
		userRevert?: Revert<DebtUserSnapshot>;
		revert?: Revert<DebtSnapshot>;
		byReceiptRevert?: Revert<DebtSnapshot>;
	},
	{ userId: UsersId; amount: number; currency: Currency }
> = {
	onMutate: (trpcContext, currData) => (updateObject) => {
		const updatedSum = cache.debts.getByUsers.update(
			trpcContext,
			currData.userId,
			currData.currency,
			(sum) => applySumUpdate(sum, currData.amount, updateObject.update)
		);
		const userSnapshot = cache.debts.getUser.update(
			trpcContext,
			currData.userId,
			updateObject.id,
			(debt) => applyUserUpdate(debt, updateObject.update)
		);
		const snapshot = cache.debts.get.update(
			trpcContext,
			updateObject.id,
			(debt) => applyUpdate(debt, updateObject.update)
		);
		const byReceiptSnapshot = cache.debts.getByReceiptId.update(
			trpcContext,
			updateObject.id,
			(debt) => applyUpdate(debt, updateObject.update)
		);
		return {
			sumRevert:
				updatedSum !== undefined
					? getSumRevert(updatedSum, currData.amount, updateObject.update)
					: undefined,
			userRevert:
				userSnapshot && getUserRevert(userSnapshot, updateObject.update),
			revert: snapshot && getRevert(snapshot, updateObject.update),
			byReceiptRevert:
				byReceiptSnapshot && getRevert(byReceiptSnapshot, updateObject.update),
		};
	},
	onSuccess: (trpcContext, currData) => (nextSyncData, updateObject) => {
		if (updateObject.update.type !== "locked") {
			return;
		}
		if (updateObject.update.value && nextSyncData) {
			const [status, intentionDirection] = nextSyncData;
			cache.debts.getUser.update(
				trpcContext,
				currData.userId,
				updateObject.id,
				(debt) => ({ ...debt, status, intentionDirection })
			);
			cache.debts.get.update(trpcContext, updateObject.id, (debt) => ({
				...debt,
				status,
				intentionDirection,
			}));
			cache.debts.getReceipt.broad.updateByDebtId(
				trpcContext,
				currData.userId,
				updateObject.id,
				(debt) => ({ ...debt, status, intentionDirection, synced: false })
			);
		}
	},
	onError:
		(trpcContext, currData) =>
		(
			_error,
			variables,
			{ sumRevert, userRevert, revert, byReceiptRevert } = {}
		) => {
			if (sumRevert) {
				cache.debts.getByUsers.update(
					trpcContext,
					currData.userId,
					currData.currency,
					sumRevert
				);
			}
			if (userRevert) {
				cache.debts.getUser.update(
					trpcContext,
					currData.userId,
					variables.id,
					userRevert
				);
			}
			if (revert) {
				cache.debts.get.update(trpcContext, variables.id, revert);
			}
			if (byReceiptRevert) {
				cache.debts.getByReceiptId.update(
					trpcContext,
					variables.id,
					byReceiptRevert
				);
			}
		},
};
