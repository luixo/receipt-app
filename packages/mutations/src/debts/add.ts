import type {
	TRPCMutationInput,
	TRPCMutationOutput,
	TRPCQueryOutput,
} from "~app/trpc";
import { getNow } from "~utils/date";

import { update as updateDebts } from "../cache/debts";
import { update as updateReceipts } from "../cache/receipts";
import type { UseContextedMutationOptions } from "../context";

type DebtSnapshot = TRPCQueryOutput<"debts.get">;
type AddResult = TRPCMutationOutput<"debts.add">;

const createDebt = (
	{ id, updatedAt, reverseAccepted }: AddResult,
	updateObject: TRPCMutationInput<"debts.add">,
): DebtSnapshot => {
	const timestamp = updateObject.timestamp || getNow.plainDate();
	return {
		id,
		amount: updateObject.amount,
		currencyCode: updateObject.currencyCode,
		userId: updateObject.userId,
		timestamp,
		note: updateObject.note,
		updatedAt,
		their: reverseAccepted
			? {
					timestamp,
					amount: updateObject.amount,
					currencyCode: updateObject.currencyCode,
					updatedAt,
				}
			: undefined,
		receiptId: updateObject.receiptId,
	};
};

export const options: UseContextedMutationOptions<"debts.add"> = {
	onSuccess: (controllerContext) => (result, updateObject) => {
		const { receiptId } = updateObject;
		if (receiptId) {
			updateReceipts(controllerContext, {
				get: (controller) => {
					controller.update(receiptId, (receipt) => ({
						...receipt,
						debt: {
							direction: "outcoming",
							ids:
								receipt.debt.direction === "outcoming"
									? receipt.debt.ids.includes(result.id)
										? receipt.debt.ids
										: [...receipt.debt.ids, result.id]
									: [result.id],
						},
					}));
				},
				getPaged: undefined,
			});
		}
		updateDebts(controllerContext, {
			getAll: (controller) => {
				controller.update(
					updateObject.currencyCode,
					(sum) => sum + updateObject.amount,
				);
			},
			getAllUser: (controller) => {
				controller.update(
					updateObject.userId,
					updateObject.currencyCode,
					(sum) => sum + updateObject.amount,
				);
			},
			getUsersPaged: (controller) => {
				controller.update(updateObject.userId);
			},
			getByUserPaged: (controller) =>
				controller.invalidate(updateObject.userId),
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
