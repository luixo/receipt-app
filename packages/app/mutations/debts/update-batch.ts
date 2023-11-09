import { cache } from "app/cache";
import { mergeUpdaterResults } from "app/cache/utils";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type { DebtsId } from "next-app/db/models";

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

type CurrenDebtWithId = CurrentDebt & { id: DebtsId };

const getMatchedDebtOrThrow = (debts: CurrenDebtWithId[], matchId: DebtsId) => {
	const matchedDebt = debts.find((debt) => debt.id === matchId);
	if (!matchedDebt) {
		throw new Error(
			`Expected to have a matching debt for id "${matchId}" in context`,
		);
	}
	return matchedDebt;
};

export const options: UseContextedMutationOptions<
	"debts.updateBatch",
	CurrenDebtWithId[]
> = {
	onMutate: (controllerContext, currDebts) => (updateObjects) =>
		cache.debts.updateRevert(controllerContext, {
			getByUsers: (controller) =>
				mergeUpdaterResults(
					...updateObjects.map((updateObject) => {
						const matchedDebt = getMatchedDebtOrThrow(
							currDebts,
							updateObject.id,
						);
						return controller.update(
							matchedDebt.userId,
							matchedDebt.currencyCode,
							applySumUpdate(matchedDebt.amount, updateObject.update),
							getSumRevert(matchedDebt.amount, updateObject.update),
						);
					}),
				),
			getUser: (controller) =>
				mergeUpdaterResults(
					...updateObjects.map((updateObject) => {
						const matchedDebt = getMatchedDebtOrThrow(
							currDebts,
							updateObject.id,
						);
						return controller.update(
							matchedDebt.userId,
							matchedDebt.id,
							applyUserUpdate(updateObject.update),
							getUserRevert(updateObject.update),
						);
					}),
				),
			get: (controller) =>
				mergeUpdaterResults(
					...updateObjects.map((updateObject) => {
						const matchedDebt = getMatchedDebtOrThrow(
							currDebts,
							updateObject.id,
						);
						return controller.update(
							matchedDebt.id,
							applyUpdate(updateObject.update),
							getRevert(updateObject.update),
						);
					}),
				),
			getIntentions: (controller) =>
				mergeUpdaterResults(
					...updateObjects.map((updateObject) => {
						const nextLockedTimestamp = getNextLockedTimestamp(
							updateObject.update,
						);
						if (!nextLockedTimestamp) {
							return;
						}
						return controller.remove(updateObject.id);
					}),
				),
		}),
	onSuccess: (controllerContext, currDebts) => (results, updateObjects) => {
		updateObjects.forEach((updateObject) => {
			const matchedDebt = getMatchedDebtOrThrow(currDebts, updateObject.id);
			if (matchedDebt.receiptId) {
				updateReceiptWithOutcomingDebtId(
					controllerContext,
					matchedDebt.receiptId,
					updateObject.id,
				);
			}
			const matchedResult = results.find(
				(result) => result.debtId === updateObject.id,
			);
			// matchedResult doesn't exist
			// hence we didn't update it in this transaction and we should update nothing in cache
			if (!matchedResult) {
				return;
			}
			updateLockedTimestamps(
				controllerContext,
				matchedDebt.userId,
				updateObject.id,
				matchedResult.lockedTimestamp || undefined,
				matchedResult.reverseLockedTimestampUpdated,
			);
		});
	},
	mutateToastOptions: (debts) => () => ({
		text: `Updating ${debts.length === 1 ? "debt" : `${debts.length} debts`}..`,
	}),
	successToastOptions: () => (_result, debts) => ({
		text: `${
			debts.length === 1 ? "Debt" : `${debts.length} debts`
		} updated successfully`,
	}),
	errorToastOptions: () => (error, debts) => ({
		text: `Error updating ${
			debts.length !== 1 ? `${debts.length} debts` : "debt"
		}: ${error.message}`,
	}),
};
