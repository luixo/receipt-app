import { cache } from "app/cache";
import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import type {
	TRPCMutationInput,
	TRPCMutationOutput,
	TRPCQueryOutput,
} from "app/trpc";

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type AddResult = TRPCMutationOutput<"debts.add">;

const createUserDebt = (
	{ id, lockedTimestamp, reverseAccepted }: AddResult,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtUserSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	created: new Date(),
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	lockedTimestamp,
	their: reverseAccepted ? { lockedTimestamp } : undefined,
	receiptId: null,
});

const createDebt = (
	{ id, lockedTimestamp, reverseAccepted }: AddResult,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	userId: updateObject.userId,
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	lockedTimestamp,
	their: reverseAccepted ? { lockedTimestamp } : undefined,
	receiptId: null,
});

export const options: UseContextedMutationOptions<"debts.add"> = {
	onSuccess: (controllerContext) => (result, updateObject) => {
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
					createUserDebt(result, updateObject),
				),
			get: (controller) => controller.add(createDebt(result, updateObject)),
			getIntentions: undefined,
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
