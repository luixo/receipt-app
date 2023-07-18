import { cache } from "app/cache";
import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";
import { TRPCQueryOutput } from "app/trpc";
import { noop } from "app/utils/utils";

type Debt = TRPCQueryOutput<"debts.get">;

export const options: UseContextedMutationOptions<
	"debtsSyncIntentions.add",
	Debt
> = {
	onMutate: (trpcContext, currDebt) => (updateObject) =>
		cache.debtsSyncIntentions.updateRevert(trpcContext, {
			getAll: (controller) =>
				controller.outbound.add({
					id: updateObject.id,
					userId: currDebt.userId,
					amount: currDebt.amount,
					currencyCode: currDebt.currencyCode,
					timestamp: currDebt.timestamp,
					intentionTimestamp: new Date(),
					note: currDebt.note,
					receiptId: currDebt.receiptId,
				}),
		}),
	onSuccess: (trpcContext, currDebt) => (_intentionTimestamp, updateObject) => {
		cache.debts.update(trpcContext, {
			get: (controller) =>
				controller.update(updateObject.id, (debt) => ({
					...debt,
					status: "unsync",
					intentionDirection: "self",
				})),
			getByReceiptId: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				controller.update(currDebt.receiptId, (debt) => ({
					...debt,
					status: "unsync",
					intentionDirection: "self",
				}));
			},
			getUser: (controller) =>
				controller.update(currDebt.userId, updateObject.id, (debt) => ({
					...debt,
					status: "unsync",
					intentionDirection: "self",
				})),
			getByUsers: noop,
			getReceipt: (controller) => {
				if (!currDebt.receiptId) {
					return;
				}
				return controller.update(
					currDebt.receiptId,
					currDebt.userId,
					(debt) => ({ ...debt, status: "unsync", intentionDirection: "self" })
				);
			},
		});
	},
	mutateToastOptions: {
		text: "Sending debt..",
	},
	successToastOptions: {
		text: "Debt sent",
	},
	errorToastOptions: () => (error) => ({
		text: `Error sending debt: ${error.message}`,
	}),
};
