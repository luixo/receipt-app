import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { CurrencyCode } from "app/utils/currency";
import { DebtsId, UsersId } from "next-app/db/models";

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.accept",
	{
		debtId: DebtsId;
		userId: UsersId;
		currencyCode: CurrencyCode;
		currentAmount?: number;
	}
> = {
	// TODO: move everything to onMutate as we have intention
	// Intention content all the data we actually need
	onSuccess: (trpcContext, context) => (result, updateObject) => {
		cache.debtsSyncIntentions.update(trpcContext, {
			getAll: (controller) => controller.inbound.remove(updateObject.id),
		});
		const { currentAmount } = context;
		if (currentAmount !== undefined) {
			cache.debts.update(trpcContext, {
				getReceipt: (controller) => {
					if (!result.receiptId) {
						return;
					}
					return controller.update(
						result.receiptId,
						context.userId,
						(debt) => ({
							...debt,
							intentionDirection: undefined,
							status: "sync",
						}),
					);
				},
				getByUsers: (controller) =>
					controller.update(
						context.userId,
						context.currencyCode,
						(sum) => sum + result.amount - currentAmount,
					),
				getUser: (controller) => {
					controller.update(context.userId, updateObject.id, (debt) => ({
						...debt,
						amount: result.amount,
						timestamp: result.timestamp,
						intentionDirection: undefined,
						status: "sync",
					}));
				},
				get: (controller) =>
					controller.update({ id: updateObject.id }, (debt) => ({
						...debt,
						amount: result.amount,
						timestamp: result.timestamp,
						intentionDirection: undefined,
						status: "sync",
					})),
			});
		} else {
			cache.debts.update(trpcContext, {
				getReceipt: (controller) => {
					if (!result.receiptId) {
						return;
					}
					return controller.update(
						result.receiptId,
						context.userId,
						(debt) => ({
							...debt,
							intentionDirection: undefined,
							status: "sync",
						}),
					);
				},
				getByUsers: (controller) =>
					controller.update(
						context.userId,
						context.currencyCode,
						(sum) => sum + result.amount,
					),
				getUser: (controller) =>
					controller.add(context.userId, {
						id: updateObject.id,
						currencyCode: context.currencyCode,
						amount: result.amount,
						timestamp: result.timestamp,
						created: result.created,
						note: result.note,
						locked: true,
						intentionDirection: undefined,
						status: "sync",
						receiptId: result.receiptId,
					}),
				get: (controller) =>
					controller.add({
						id: updateObject.id,
						userId: context.userId,
						currencyCode: context.currencyCode,
						amount: result.amount,
						timestamp: result.timestamp,
						note: result.note,
						locked: true,
						intentionDirection: undefined,
						status: "sync",
						receiptId: result.receiptId,
					}),
			});
		}
	},
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
