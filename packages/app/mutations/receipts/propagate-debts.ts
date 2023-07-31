import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<"receipts.propagateDebts"> = {
	onSuccess: (controllerContext) => (updatedDebts, updateObject) => {
		updateReceiptCacheOnDebtUpdate(
			controllerContext,
			updateObject.receiptId,
			updateObject.lockedTimestamp,
			updatedDebts.map((debt) => ({ ...debt, deltaAmount: debt.amount })),
		);
	},
	errorToastOptions: () => (error) => ({
		text: `Error propagating debts: ${error.message}`,
	}),
};
