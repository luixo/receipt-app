import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptId, UserId } from "~db/ids";

import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

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
	{
		currDebt: {
			userId: UserId;
			amount: number;
			currencyCode: CurrencyCode;
			receiptId?: ReceiptId;
		};
	}
> = {
	mutationKey: "debts.update",
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
					currDebt.userId,
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
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.updateDebt.mutate", {
				ns: "debts",
				debtsAmount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(resultSet) => ({
			text: t("toasts.updateDebt.success", {
				ns: "debts",
				debtsAmount: resultSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.updateDebt.error", {
				ns: "debts",
				debtsAmount: errors.length,
				errors,
			}),
		}),
};
