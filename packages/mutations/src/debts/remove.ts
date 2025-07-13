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
		() =>
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
				getUsersPaged: (controller) => controller.update(currDebt.userId),
				getByUserPaged: undefined,
				// We remove the debt from everywhere else
				// but it's own page
				// otherwise the page will try to refetch the data immediately
				get: undefined,
				getIntentions: undefined,
			}),
	onSuccess:
		(controllerContext, { debt: currDebt }) =>
		(result, updateObject) => {
			updateReceipts(controllerContext, {
				get: (controller) =>
					controller.updateAll((receipt) => {
						if (receipt.debts.direction === "incoming") {
							if (!receipt.debts.id) {
								return receipt;
							}
							if (receipt.debts.id === updateObject.id) {
								return {
									...receipt,
									debts: receipt.debts.hasForeign
										? { ...receipt.debts, hasForeign: true, hasMine: false }
										: {
												...receipt.debts,
												hasForeign: false,
												hasMine: false,
												id: undefined,
											},
								};
							}
							return receipt;
						}
						if (
							receipt.debts.debts.some((debt) => debt.id === updateObject.id)
						) {
							const nextDebts = receipt.debts.debts.filter(
								({ id }) => id !== updateObject.id,
							);
							return {
								...receipt,
								debts: { ...receipt.debts, debts: nextDebts },
							};
						}
						return receipt;
					}),
				getPaged: undefined,
			});
			updateDebts(controllerContext, {
				getAll: undefined,
				getAllUser: undefined,
				getUsersPaged: undefined,
				getByUserPaged: (controller) => controller.invalidate(currDebt.userId),
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
