import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { DebtsId } from "next-app/db/models";

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const createUserDebt = (
	id: DebtsId,
	lockedTimestamp: Date,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtUserSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	created: new Date(),
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	lockedTimestamp,
	their: undefined,
	receiptId: null,
});

const createDebt = (
	id: DebtsId,
	lockedTimestamp: Date,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	userId: updateObject.userId,
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	lockedTimestamp,
	their: undefined,
	receiptId: null,
});

export const options: UseContextedMutationOptions<"debts.add"> = {
	onSuccess:
		(controllerContext) =>
		({ id: stableId, lockedTimestamp }, updateObject) => {
			cache.debts.update(controllerContext, {
				getByUsers: (controller) =>
					controller.update(
						updateObject.userId,
						updateObject.currencyCode,
						(sum) => sum + updateObject.amount,
					),
				getUser: (controller) =>
					controller.add(
						updateObject.userId,
						createUserDebt(stableId, lockedTimestamp, updateObject),
					),
				get: (controller) =>
					controller.add(createDebt(stableId, lockedTimestamp, updateObject)),
				getIntentions: noop,
			});
		},
	mutateToastOptions: {
		text: "Adding debt..",
	},
	successToastOptions: {
		text: "Debt added",
	},
	errorToastOptions: () => (error) => ({
		text: `Error adding debt: ${error.message}`,
	}),
};
