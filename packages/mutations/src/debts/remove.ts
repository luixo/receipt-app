import type { TRPCQueryOutput } from "~app/trpc";

import {
	update as updateDebts,
	updateRevert as updateRevertDebts,
} from "../cache/debts";
import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"debts.remove",
	{ debt: TRPCQueryOutput<"debts.get"> }
> = {
	onMutate:
		(controllerContext, { debt: currDebt }) =>
		(updateObject) =>
			updateRevertDebts(controllerContext, {
				getAll: (controller) =>
					controller.update(
						currDebt.currencyCode,
						(sum) => sum - currDebt.amount,
						() => (sum) => sum + currDebt.amount,
					),
				getAllUser: (controller) =>
					controller.update(
						currDebt.userId,
						currDebt.currencyCode,
						(sum) => sum - currDebt.amount,
						() => (sum) => sum + currDebt.amount,
					),
				getByUsers: (controller) =>
					controller.updateCurrency(
						currDebt.userId,
						currDebt.currencyCode,
						(sum) => sum - currDebt.amount,
						() => (sum) => sum + currDebt.amount,
					),
				getIdsByUser: (controller) =>
					controller.remove(currDebt.userId, updateObject.id),
				// We remove the debt from everywhere else
				// but it's own page
				// otherwise the page will try to refetch the data immediately
				get: undefined,
				getIntentions: undefined,
			}),
	onSuccess: (controllerContext) => (result, updateObject) => {
		updateReceipts(controllerContext, {
			get: (controller) =>
				controller.updateAll((receipt) => {
					if (receipt.debt.direction === "incoming") {
						if (!receipt.debt.id) {
							return receipt;
						}
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
						return receipt;
					}
					if (receipt.debt.ids.includes(updateObject.id)) {
						const nextIds = receipt.debt.ids.filter(
							(id) => id !== updateObject.id,
						);
						return { ...receipt, debt: { ...receipt.debt, ids: nextIds } };
					}
					return receipt;
				}),
			getPaged: undefined,
		});
		updateDebts(controllerContext, {
			getAll: undefined,
			getAllUser: undefined,
			getByUsers: undefined,
			getIdsByUser: undefined,
			get: (controller) => controller.remove(updateObject.id),
			getIntentions: (controller) => {
				if (result.reverseRemoved) {
					return;
				}
				// We may or may not know the parameters of counterparty debt
				// Invalidating intentions might be a good idea
				controller.invalidate();
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
