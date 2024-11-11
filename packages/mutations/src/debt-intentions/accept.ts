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
				getByUsers: (controller) =>
					controller.updateCurrency(
						intention.userId,
						intention.currencyCode,
						(sum) => sum - (intention.current?.amount ?? 0) + intention.amount,
						(snapshot) => () => snapshot,
					),
				getIdsByUser: (controller) => {
					if (intention.current) {
						return controller.update(
							intention.userId,
							intention.id,
							(debt) =>
								intention.timestamp === debt.timestamp
									? debt
									: {
											...debt,
											timestamp: intention.timestamp,
									  },
							(snapshot) => (debt) =>
								snapshot.timestamp === debt.timestamp
									? debt
									: {
											...debt,
											timestamp: snapshot.timestamp,
									  },
						);
					}
					return controller.add(intention.userId, {
						id: intention.id,
						timestamp: intention.timestamp,
					});
				},
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
				getIntentions: (controller) => controller.remove(intention.id),
			}),
	onSuccess:
		(controllerContext, { intention }) =>
		(data) =>
			updateDebts(controllerContext, {
				getByUsers: undefined,
				getIdsByUser: undefined,
				get: (controller) =>
					controller.update(intention.id, (debt) => ({
						...debt,
						updatedAt: data.updatedAt,
					})),
				getIntentions: undefined,
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
