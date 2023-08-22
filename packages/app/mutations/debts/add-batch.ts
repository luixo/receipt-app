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
			receiptId: null,
		},
		updateObject.userId,
	]);

const createDebts = (
	{ ids, lockedTimestamp, reverseAcceptedUserIds }: AddBatchResult,
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
		their: reverseAcceptedUserIds.includes(updateObject.userId)
			? { lockedTimestamp }
			: undefined,
		receiptId: null,
	}));

export const options: UseContextedMutationOptions<"debts.addBatch"> = {
	onSuccess: (controllerContext) => (result, updateObjects) => {
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
