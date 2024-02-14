import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type {
	TRPCMutationInput,
	TRPCMutationOutput,
	TRPCQueryOutput,
} from "app/trpc";
import type { UsersId } from "next-app/db/models";

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type AddBatchResult = TRPCMutationOutput<"debts.addBatch">;

const createUserDebts = (
	{ ids, lockedTimestamp, reverseAcceptedUserIds }: AddBatchResult,
	updateObjects: TRPCMutationInput<"debts.addBatch">,
): [DebtUserSnapshot, UsersId][] =>
	updateObjects.map((updateObject, index) => [
		{
			id: ids[index]!,
			amount: updateObject.amount,
			currencyCode: updateObject.currencyCode,
			created: new Date(),
			timestamp: updateObject.timestamp || new Date(),
			note: updateObject.note,
			lockedTimestamp,
			their: reverseAcceptedUserIds.includes(updateObject.userId)
				? { lockedTimestamp }
				: undefined,
			receiptId: updateObject.receiptId ?? null,
		},
		updateObject.userId,
	]);

const createDebts = (
	{ ids, lockedTimestamp, reverseAcceptedUserIds }: AddBatchResult,
	updateObjects: TRPCMutationInput<"debts.addBatch">,
): DebtSnapshot[] =>
	updateObjects.map((updateObject, index) => {
		const timestamp = updateObject.timestamp || new Date();
		return {
			id: ids[index]!,
			amount: updateObject.amount,
			currencyCode: updateObject.currencyCode,
			userId: updateObject.userId,
			timestamp,
			note: updateObject.note,
			lockedTimestamp,
			their: reverseAcceptedUserIds.includes(updateObject.userId)
				? {
						lockedTimestamp,
						amount: updateObject.amount,
						currencyCode: updateObject.currencyCode,
						timestamp,
				  }
				: undefined,
			receiptId: updateObject.receiptId ?? null,
		};
	});

export const options: UseContextedMutationOptions<"debts.addBatch"> = {
	onSuccess: (controllerContext) => (result, updateObjects) => {
		const receiptIdUpdateObjects = updateObjects
			.map((updateObject, index) => ({
				...updateObject,
				id: result.ids[index]!,
			}))
			.filter((updateObject) => updateObject.receiptId);
		if (receiptIdUpdateObjects.length !== 0) {
			cache.receipts.update(controllerContext, {
				get: (controller) => {
					receiptIdUpdateObjects.forEach((updateObject) => {
						controller.update(updateObject.receiptId!, (receipt) => ({
							...receipt,
							debt: {
								direction: "outcoming",
								ids:
									receipt.debt?.direction === "outcoming"
										? receipt.debt.ids.includes(updateObject.id)
											? receipt.debt.ids
											: [...receipt.debt.ids, updateObject.id]
										: [updateObject.id],
							},
						}));
					});
				},
				getNonResolvedAmount: undefined,
				getPaged: undefined,
			});
		}
		cache.debts.update(controllerContext, {
			getByUsers: (controller) => {
				updateObjects.forEach((updateObject) =>
					controller.update(
						updateObject.userId,
						updateObject.currencyCode,
						(sum) => sum + updateObject.amount,
					),
				);
			},
			getUser: (controller) => {
				createUserDebts(result, updateObjects).forEach(([debt, userId]) =>
					controller.add(userId, debt),
				);
			},
			get: (controller) =>
				createDebts(result, updateObjects).forEach((debt) =>
					controller.add(debt),
				),
			getIntentions: undefined,
		});
	},
	mutateToastOptions: () => (debts) => ({
		text:
			debts.length === 1 ? "Adding debt.." : `Adding ${debts.length} debts..`,
	}),
	successToastOptions: () => (_results, debts) => ({
		text: debts.length === 1 ? "Debt added" : `${debts.length} debts added`,
	}),
	errorToastOptions: () => (error, debts) => ({
		text: `Error adding ${
			debts.length === 1 ? "debt" : `${debts.length} debts`
		}: ${error.message}`,
	}),
};
