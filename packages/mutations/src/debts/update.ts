import type { CurrencyCode } from "~app/utils/currency";
import type { PeerId, ReceiptId } from "~db/ids";

import { updateRevert as updateRevertDebts } from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";
import { mergeUpdaterResults } from "../utils";

import {
	applyUpdate,
	getRevert,
	updateReceiptWithOutcomingDebtId,
	updateUpdatedAt,
} from "./utils";

export const options: UseContextedMutationOptions<
	"debts.update",
	{
		currDebt: {
			peerId: PeerId;
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
			const newCurrencyCode = update.currencyCode ?? currDebt.currencyCode;
			const newAmount = update.amount ?? currDebt.amount;
			return updateRevertDebts(controllerContext, {
				getAll: (controller) =>
					mergeUpdaterResults(
						controller.update(
							currDebt.currencyCode,
							(sum) => sum - currDebt.amount,
							(updatedSum) => () => updatedSum + currDebt.amount,
						),
						controller.update(
							newCurrencyCode,
							(sum) => sum + newAmount,
							(updatedSum) => () => updatedSum - newAmount,
						),
					),
				getAllPeer: (controller) =>
					mergeUpdaterResults(
						controller.update(
							currDebt.peerId,
							currDebt.currencyCode,
							(sum) => sum - currDebt.amount,
							(updatedSum) => () => updatedSum + currDebt.amount,
						),
						controller.update(
							currDebt.peerId,
							newCurrencyCode,
							(sum) => sum + newAmount,
							(updatedSum) => () => updatedSum - newAmount,
						),
					),
				getPeersPaged: (controller) => controller.update(currDebt.peerId),
				getByPeerPaged: (controller) => {
					// Updating currency code or amount might change resolved list status
					if (update.currencyCode || update.amount) {
						controller.invalidate(currDebt.peerId, {
							filters: { showResolved: false },
						});
					}
					// Updating timestamp might change position in a list
					if (update.timestamp) {
						controller.invalidate(currDebt.peerId);
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
					currDebt.peerId,
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
