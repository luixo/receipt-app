import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { DebtsId, UsersId } from "next-app/db/models";

export const MIN_BATCH_DEBTS = 1;
export const MAX_BATCH_DEBTS = 10;

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const createUserDebts = (
	ids: DebtsId[],
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
			locked: false,
			status: "nosync",
			intentionDirection: undefined,
			receiptId: null,
		},
		updateObject.userId,
	]);

const createDebts = (
	ids: DebtsId[],
	updateObjects: TRPCMutationInput<"debts.addBatch">,
): DebtSnapshot[] =>
	updateObjects.map((updateObject, index) => ({
		id: ids[index]!,
		amount: updateObject.amount,
		currencyCode: updateObject.currencyCode,
		userId: updateObject.userId,
		timestamp: updateObject.timestamp || new Date(),
		note: updateObject.note,
		locked: false,
		status: "nosync",
		intentionDirection: undefined,
		receiptId: null,
	}));

export const options: UseContextedMutationOptions<"debts.addBatch"> = {
	onSuccess: (trpcContext) => (stableIds, updateObjects) => {
		cache.debts.update(trpcContext, {
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
				createUserDebts(stableIds, updateObjects).forEach(([debt, userId]) =>
					controller.add(userId, debt),
				);
			},
			get: (controller) =>
				createDebts(stableIds, updateObjects).forEach((debt) =>
					controller.add(debt),
				),
			getReceipt: noop,
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
