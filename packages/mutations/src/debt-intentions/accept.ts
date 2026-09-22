import type { DebtIntention } from "~app/trpc-types";

import {
	update as updateDebts,
	updateRevert as updateRevertDebts,
} from "../cache/debts";
import type { UseContextedMutationOptions } from "../context";

export const options: UseContextedMutationOptions<
	"debtIntentions.accept",
	{ intention: DebtIntention }
> = {
	mutationKey: "debtIntentions.accept",
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
				getAllPeer: (controller) =>
					controller.update(
						intention.peerId,
						intention.currencyCode,
						(sum) => sum - (intention.current?.amount ?? 0) + intention.amount,
						(snapshot) => () => snapshot,
					),
				getPeersPaged: (controller) => controller.update(intention.peerId),
				getByPeerPaged: undefined,
				get: (controller) => {
					const updatedAt = Temporal.Now.zonedDateTimeISO();
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
						peerId: intention.peerId,
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
				getAllPeer: undefined,
				getPeersPaged: undefined,
				getByPeerPaged: (controller) => controller.invalidate(intention.peerId),
				get: (controller) => {
					controller.update(intention.id, (debt) => ({
						...debt,
						updatedAt: data.updatedAt,
					}));
				},
				getIntentions: (controller) => {
					controller.remove(intention.id);
				},
			}),
	mutateToastOptions:
		({ t }) =>
		(variablesSet) => ({
			text: t("toasts.acceptIntention.mutate", {
				ns: "debts",
				debtsAmount: variablesSet.length,
			}),
		}),
	successToastOptions:
		({ t }) =>
		(resultSet) => ({
			text: t("toasts.acceptIntention.success", {
				ns: "debts",
				debtsAmount: resultSet.length,
			}),
		}),
	errorToastOptions:
		({ t }) =>
		(errors) => ({
			text: t("toasts.acceptIntention.error", {
				ns: "debts",
				debtsAmount: errors.length,
				errors,
			}),
		}),
};
