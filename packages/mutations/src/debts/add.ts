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
	mutationKey: "debts.add",
	onSuccess: (controllerContext) => (result, updateObject) => {
		const { receiptId } = updateObject;
		if (receiptId) {
			updateReceipts(controllerContext, {
				get: (controller) => {
					controller.update(receiptId, (receipt) => ({
						...receipt,
						debts: {
							direction: "outcoming",
							debts:
								receipt.debts.direction === "outcoming"
									? receipt.debts.debts.some((debt) => debt.id === result.id)
										? receipt.debts.debts
										: [
												...receipt.debts.debts,
												{ id: result.id, userId: updateObject.userId },
											]
									: [{ id: result.id, userId: updateObject.userId }],
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
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.addDebt.mutate", {
				ns: "debts",
				debtsAmount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(resultSet) => ({
			text: t("toasts.addDebt.success", {
				ns: "debts",
				debtsAmount: resultSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.addDebt.error", {
				ns: "debts",
				debtsAmount: errors.length,
				errors,
			}),
		}),
};
