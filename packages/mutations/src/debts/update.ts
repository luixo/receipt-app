import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

import type { CurrentDebt } from "./utils";
import {
	applyByUserIdUpdate,
	applySumUpdate,
	applyUpdate,
	getByUserIdRevert,
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
