import type { TRPCQueryOutput } from "~app/trpc";

import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"debts.remove",
	TRPCQueryOutput<"debts.get">
> = {
	onMutate: (controllerContext, currDebt) => (updateObject) =>
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) =>
				controller.update(
					currDebt.userId,
					currDebt.currencyCode,
					(sum) => sum - currDebt.amount,
					() => (sum) => sum + currDebt.amount,
				),
			getUser: (controller) =>
				controller.remove(currDebt.userId, updateObject.id),
			// We remove the debt from everywhere else
			// but it's own page
			// otherwise the page will try to refetch the data immediately
			get: undefined,
			getIntentions: undefined,
		}),
	onSuccess: (controllerContext, currDebt) => (result, updateObject) => {
		cache.receipts.update(controllerContext, {
			get: (controller) =>
				controller.updateAll((receipt) => {
					if (!receipt.debt) {
						return receipt;
					}
					if (receipt.debt.direction === "incoming") {
						if (receipt.debt.id === updateObject.id) {
							return {
								...receipt,
								debt: receipt.debt.hasForeign
									? { ...receipt.debt, hasForeign: true, hasMine: false }
									: {
											...receipt.debt,
											hasForeign: false,
											hasMine: false,
											id: undefined,
									  },
							};
						}
					} else if (receipt.debt.direction === "outcoming") {
						if (receipt.debt.ids.includes(updateObject.id)) {
							const nextIds = receipt.debt.ids.filter(
								(id) => id !== updateObject.id,
							);
							return { ...receipt, debt: { ...receipt.debt, ids: nextIds } };
						}
					}
					return receipt;
				}),
			getPaged: undefined,
			getNonResolvedAmount: undefined,
		});
		cache.debts.update(controllerContext, {
			getByUsers: undefined,
			getUser: undefined,
			get: (controller) => controller.remove(updateObject.id),
			getIntentions: (controller) => {
				if (!currDebt.their?.lockedTimestamp || result.reverseRemoved) {
					return;
				}
				if (
					currDebt.their.lockedTimestamp.valueOf() ===
					currDebt.lockedTimestamp?.valueOf()
				) {
					controller.add({
						id: currDebt.id,
						userId: currDebt.userId,
						amount: currDebt.amount,
						currencyCode: currDebt.currencyCode,
						lockedTimestamp: currDebt.lockedTimestamp,
						timestamp: currDebt.timestamp,
						note: currDebt.note,
						receiptId: currDebt.receiptId,
					});
				} else {
					// We don't know the parameters of counterparty debt, hence we should invalidate intentions
					controller.invalidate();
				}
			},
		});
	},
	mutateToastOptions: {
		text: "Removing debt..",
	},
	successToastOptions: {
		text: "Debt removed",
	},
	errorToastOptions: () => (error) => ({
		text: `Error removing debt: ${error.message}`,
	}),
};
