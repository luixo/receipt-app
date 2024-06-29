import * as cache from "../cache";
import type { UseContextedMutationOptions } from "../context";

import type { CurrentDebt } from "./utils";
import {
	applySumUpdate,
	applyUpdate,
	applyUserUpdate,
	getNextLockedTimestamp,
	getRevert,
	getSumRevert,
	getUserRevert,
	updateLockedTimestamps,
	updateReceiptWithOutcomingDebtId,
} from "./utils";

export const options: UseContextedMutationOptions<"debts.update", CurrentDebt> =
	{
		onMutate: (controllerContext, currDebt) => (updateObject) =>
			cache.debts.updateRevert(controllerContext, {
				getByUsers: (controller) =>
					controller.updateCurrency(
						currDebt.userId,
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, updateObject.update),
						getSumRevert(currDebt.amount, updateObject.update),
					),
				getUser: (controller) =>
					controller.update(
						currDebt.userId,
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
					const nextLockedTimestamp = getNextLockedTimestamp(
						updateObject.update,
					);
					if (!nextLockedTimestamp) {
						return;
					}
					return controller.remove(updateObject.id);
				},
			}),
		onSuccess: (controllerContext, currDebt) => (result, updateObject) => {
			if (currDebt.receiptId) {
				updateReceiptWithOutcomingDebtId(
					controllerContext,
					currDebt.receiptId,
					updateObject.id,
				);
			}
			// lockedTimestamp is undefined (in contrary to being null)
			// hence we didn't update it in this transaction and we should update nothing in cache
			if (result.lockedTimestamp === undefined) {
				return;
			}
			updateLockedTimestamps(
				controllerContext,
				currDebt,
				updateObject.id,
				result.lockedTimestamp || undefined,
				result.reverseLockedTimestampUpdated,
			);
		},
		mutateToastOptions: { text: "Updating debt.." },
		successToastOptions: { text: "Debt updated successfully" },
		errorToastOptions: () => (error) => ({
			text: `Error updating debt: ${error.message}`,
		}),
	};
