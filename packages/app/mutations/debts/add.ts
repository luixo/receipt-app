import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCMutationInput, TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";
import { DebtsId } from "next-app/db/models";

type DebtUserSnapshot = TRPCQueryOutput<"debts.getUser">[number];
type DebtSnapshot = TRPCQueryOutput<"debts.get">;

const createUserDebt = (
	id: DebtsId,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtUserSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	created: new Date(),
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	locked: false,
	syncStatus: { type: "nosync" },
	receiptId: null,
});

const createDebt = (
	id: DebtsId,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtSnapshot => ({
	id,
	amount: updateObject.amount,
	currencyCode: updateObject.currencyCode,
	userId: updateObject.userId,
	timestamp: updateObject.timestamp || new Date(),
	note: updateObject.note,
	locked: false,
	syncStatus: { type: "nosync" },
	receiptId: null,
});

export const options: UseContextedMutationOptions<"debts.add"> = {
	onSuccess: (trpcContext) => (stableId, updateObject) => {
		cache.debts.update(trpcContext, {
			getByUsers: (controller) =>
				controller.update(
					updateObject.userId,
					updateObject.currencyCode,
					(sum) => sum + updateObject.amount,
				),
			getUser: (controller) =>
				controller.add(
					updateObject.userId,
					createUserDebt(stableId, updateObject),
				),
			get: (controller) => controller.add(createDebt(stableId, updateObject)),
			getReceipt: noop,
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
