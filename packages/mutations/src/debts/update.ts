import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

import type { CurrentDebt } from "./utils";
import {
	applySumUpdate,
	applyUpdate,
	getRevert,
	getSumRevert,
	updateReceiptWithOutcomingDebtId,
	updateUpdatedAt,
} from "./utils";

export const options: UseContextedMutationOptions<
	"debts.update",
	{ currDebt: CurrentDebt }
> = {
	onMutate:
		(controllerContext, { currDebt }) =>
		(updateObject) =>
			updateRevertDebts(controllerContext, {
				getAll: (controller) =>
					controller.update(
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, updateObject.update),
						getSumRevert(currDebt.amount, updateObject.update),
					),
				getAllUser: (controller) =>
					controller.update(
						currDebt.userId,
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, updateObject.update),
						getSumRevert(currDebt.amount, updateObject.update),
					),
				getUsersPaged: (controller) => controller.update(currDebt.userId),
				// @ts-expect-error update when changing resolved list?
				getByUserPaged: (controller) => {
					// Updating currency code or amount might change resolved list status
					if (updateObject.update.currencyCode || updateObject.update.amount) {
						controller.invalidate(currDebt.userId, {
							filters: { showResolved: false },
						});
					}
					// Updating timestamp might change position in a list
					if (updateObject.update.timestamp) {
						controller.invalidate(currDebt.userId);
					}
				},
				get: (controller) =>
					controller.update(
						updateObject.id,
						applyUpdate(updateObject.update),
						getRevert(updateObject.update),
					),
				getIntentions: undefined,
			}),
	onSuccess:
		(controllerContext, { currDebt }) =>
		(result, updateObject) => {
			if (currDebt.receiptId) {
				updateReceiptWithOutcomingDebtId(
					controllerContext,
					currDebt.receiptId,
					updateObject.id,
				);
			}
			updateUpdatedAt(
				controllerContext,
				updateObject.id,
				result.updatedAt,
				result.reverseUpdated,
			);
		},
	mutateToastOptions: { text: "Updating debt.." },
	successToastOptions: { text: "Debt updated successfully" },
	errorToastOptions: () => (error) => ({
		text: `Error updating debt: ${error.message}`,
	}),
};
