import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { DebtsId, UsersId } from "next-app/db/models";

export const MIN_BATCH_DEBTS = 1;
export const MAX_BATCH_DEBTS = 10;

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const createUserDebts = (
	ids: DebtsId[],
	lockedTimestamp: Date,
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
			their: undefined,
			receiptId: null,
		},
		updateObject.userId,
	]);

const createDebts = (
	ids: DebtsId[],
	lockedTimestamp: Date,
	updateObjects: TRPCMutationInput<"debts.addBatch">,
): DebtSnapshot[] =>
	updateObjects.map((updateObject, index) => ({
		id: ids[index]!,
		amount: updateObject.amount,
		currencyCode: updateObject.currencyCode,
		userId: updateObject.userId,
		timestamp: updateObject.timestamp || new Date(),
		note: updateObject.note,
		lockedTimestamp,
		their: undefined,
		receiptId: null,
	}));

export const options: UseContextedMutationOptions<"debts.addBatch"> = {
	onSuccess:
		(controllerContext) =>
		({ ids: stableIds, lockedTimestamp }, updateObjects) => {
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
					createUserDebts(stableIds, lockedTimestamp, updateObjects).forEach(
						([debt, userId]) => controller.add(userId, debt),
					);
				},
				get: (controller) =>
					createDebts(stableIds, lockedTimestamp, updateObjects).forEach(
						(debt) => controller.add(debt),
					),
				getIntentions: undefined,
			});
		},
	mutateToastOptions: {
		text: "Adding debts..",
	},
	successToastOptions: {
		text: "Debts added",
	},
	errorToastOptions: () => (error) => ({
		text: `Error adding debts: ${error.message}`,
	}),
};
