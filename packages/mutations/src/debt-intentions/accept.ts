import type { TRPCQueryOutput } from "~app/trpc";

import {
	update as updateDebts,
	updateRevert as updateRevertDebts,
} from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

type Intention = TRPCQueryOutput<"debtIntentions.getAll">[number];

export const options: UseContextedMutationOptions<
	"debtIntentions.accept",
	{ intention: Intention }
> = {
	onMutate:
		(controllerContext, { intention }) =>
		() =>
			updateRevertDebts(controllerContext, {
				getAll: (controller) =>
					controller.update(
						intention.currencyCode,
						(sum) => sum - (intention.current?.amount ?? 0) + intention.amount,
						(snapshot) => () => snapshot,
					),
				getAllUser: (controller) =>
					controller.update(
						intention.userId,
						intention.currencyCode,
						(sum) => sum - (intention.current?.amount ?? 0) + intention.amount,
						(snapshot) => () => snapshot,
					),
				getUsersPaged: (controller) => controller.update(intention.userId),
				getByUserPaged: undefined,
				get: (controller) => {
					const updatedAt = new Date();
					if (intention.current) {
						return controller.update(
							intention.id,
							(debt) => ({
								...debt,
								currencyCode: intention.currencyCode,
								amount: intention.amount,
								timestamp: intention.timestamp,
								updatedAt,
							}),
							(snapshot) => (debt) => ({
								...debt,
								currencyCode: snapshot.currencyCode,
								amount: snapshot.amount,
								timestamp: snapshot.timestamp,
								updatedAt: snapshot.updatedAt,
							}),
						);
					}
					return controller.add({
						id: intention.id,
						userId: intention.userId,
						currencyCode: intention.currencyCode,
						amount: intention.amount,
						timestamp: intention.timestamp,
						note: intention.note,
						updatedAt,
						their: {
							updatedAt: intention.updatedAt,
							timestamp: intention.timestamp,
							amount: intention.amount,
							currencyCode: intention.currencyCode,
						},
						receiptId: intention.receiptId,
					});
				},
				getIntentions: undefined,
			}),
	onSuccess:
		(controllerContext, { intention }) =>
		(data) =>
			updateDebts(controllerContext, {
				getAll: undefined,
				getAllUser: undefined,
				getUsersPaged: undefined,
				getByUserPaged: (controller) => controller.invalidate(intention.userId),
				get: (controller) =>
					controller.update(intention.id, (debt) => ({
						...debt,
						updatedAt: data.updatedAt,
					})),

				getIntentions: (controller) => controller.remove(intention.id),
			}),
	mutateToastOptions: {
		text: `Accepting debt..`,
	},
	successToastOptions: {
		text: `Debt accepted successfully`,
	},
	errorToastOptions: () => (error) => ({
		text: `Error accepting debt: ${error.message}`,
	}),
};
