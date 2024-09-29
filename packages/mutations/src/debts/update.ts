import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

import type { CurrentDebt } from "./utils";
import {
	applyByUserIdUpdate,
	applySumUpdate,
	applyUpdate,
	getByUserIdRevert,
	getNextLockedTimestamp,
	getRevert,
	getSumRevert,
	updateLockedTimestamps,
	updateReceiptWithOutcomingDebtId,
} from "./utils";

export const options: UseContextedMutationOptions<"debts.update", CurrentDebt> =
	{
		onMutate: (controllerContext, currDebt) => (updateObject) =>
			updateRevertDebts(controllerContext, {
				getByUsers: (controller) =>
					controller.updateCurrency(
						currDebt.userId,
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, updateObject.update),
						getSumRevert(currDebt.amount, updateObject.update),
					),
				getIdsByUser: (controller) =>
					controller.update(
						currDebt.userId,
						updateObject.id,
						applyByUserIdUpdate(updateObject.update),
						getByUserIdRevert(updateObject.update),
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
			updateLockedTimestamps(
				controllerContext,
				currDebt,
				updateObject.id,
				result.lockedTimestamp,
				result.reverseLockedTimestampUpdated,
			);
		},
		mutateToastOptions: { text: "Updating debt.." },
		successToastOptions: { text: "Debt updated successfully" },
		errorToastOptions: () => (error) => ({
			text: `Error updating debt: ${error.message}`,
		}),
	};
