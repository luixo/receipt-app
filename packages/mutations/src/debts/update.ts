import type { CurrencyCode } from "~app/utils/currency";
import type { ReceiptId, UserId } from "~db/ids";

import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

import {
	addToSum,
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
		(updateObject) => {
			const { update } = updateObject;
			const newCurrencyCode = update.currencyCode;
			const isCurrencyChange =
				newCurrencyCode !== undefined &&
				newCurrencyCode !== currDebt.currencyCode;
			if (isCurrencyChange) {
				const movedCurrencyCode = newCurrencyCode as CurrencyCode;
				const newAmount = update.amount ?? currDebt.amount;
				return updateRevertDebts(controllerContext, {
					getAll: (controller) =>
						mergeUpdaterResults(
							controller.update(
								currDebt.currencyCode,
								(sum) => addToSum(sum, -currDebt.amount),
								(updatedSum) => () => addToSum(updatedSum, currDebt.amount),
							),
							controller.update(
								movedCurrencyCode,
								(sum) => addToSum(sum, newAmount),
								(updatedSum) => () => addToSum(updatedSum, -newAmount),
							),
						),
					getAllUser: (controller) =>
						mergeUpdaterResults(
							controller.update(
								currDebt.userId,
								currDebt.currencyCode,
								(sum) => addToSum(sum, -currDebt.amount),
								(updatedSum) => () => addToSum(updatedSum, currDebt.amount),
							),
							controller.update(
								currDebt.userId,
								movedCurrencyCode,
								(sum) => addToSum(sum, newAmount),
								(updatedSum) => () => addToSum(updatedSum, -newAmount),
							),
						),
					getUsersPaged: (controller) => controller.update(currDebt.userId),
					getByUserPaged: (controller) => {
						controller.invalidate(currDebt.userId, {
							filters: { showResolved: false },
						});
						return undefined;
					},
					get: (controller) =>
						controller.update(
							updateObject.id,
							applyUpdate(update),
							getRevert(update),
						),
					getIntentions: undefined,
				});
			}
			return updateRevertDebts(controllerContext, {
				getAll: (controller) =>
					controller.update(
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, update),
						getSumRevert(currDebt.amount, update),
					),
				getAllUser: (controller) =>
					controller.update(
						currDebt.userId,
						currDebt.currencyCode,
						applySumUpdate(currDebt.amount, update),
						getSumRevert(currDebt.amount, update),
					),
				getUsersPaged: (controller) => controller.update(currDebt.userId),
				getByUserPaged: (controller) => {
					// Updating currency code or amount might change resolved list status
					if (update.currencyCode || update.amount) {
						controller.invalidate(currDebt.userId, {
							filters: { showResolved: false },
						});
					}
					// Updating timestamp might change position in a list
					if (update.timestamp) {
						controller.invalidate(currDebt.userId);
					}
					return undefined;
				},
				get: (controller) =>
					controller.update(
						updateObject.id,
						applyUpdate(update),
						getRevert(update),
					),
				getIntentions: undefined,
			});
		},
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
