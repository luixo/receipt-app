import { cache, Revert } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";

type DebtSum = number;
type DebtUserSnapshot = TRPCQueryOutput<"debts.get-user">[number];
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
		}
	};

export const mutationOptions: UseContextedMutationOptions<
	"debts.update",
	{
		sumRevert?: Revert<DebtSum>;
		userRevert?: Revert<DebtUserSnapshot>;
		revert?: Revert<DebtSnapshot>;
	},
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) => {
		const updatedSum = cache.debts.getByUsers.update(
			trpcContext,
			currDebt.userId,
			currDebt.currency,
			(sum) => applySumUpdate(sum, currDebt.amount, updateObject.update)
		);
		const userSnapshot = cache.debts.getUser.update(
			trpcContext,
			currDebt.userId,
			updateObject.id,
			(debt) => applyUserUpdate(debt, updateObject.update)
		);
		const snapshot = cache.debts.get.update(
			trpcContext,
			updateObject.id,
			(debt) => applyUpdate(debt, updateObject.update)
		);
		return {
			sumRevert:
				updatedSum !== undefined
					? getSumRevert(updatedSum, currDebt.amount, updateObject.update)
					: undefined,
			userRevert:
				userSnapshot && getUserRevert(userSnapshot, updateObject.update),
			revert: snapshot && getRevert(snapshot, updateObject.update),
		};
	},
	onError:
		(trpcContext, currDebt) =>
		(_error, variables, { sumRevert, userRevert, revert } = {}) => {
			if (sumRevert) {
				cache.debts.getByUsers.update(
					trpcContext,
					currDebt.userId,
					variables.id,
					sumRevert
				);
			}
			if (userRevert) {
				cache.debts.getUser.update(
					trpcContext,
					currDebt.userId,
					variables.id,
					userRevert
				);
			}
			if (revert) {
				cache.debts.get.update(trpcContext, variables.id, revert);
			}
		},
};
