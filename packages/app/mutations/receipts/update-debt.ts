import type { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<
	"receipts.updateDebt",
	{ prevAmount: number; receiptTimestamp: Date }
> = {
	onSuccess:
		(controllerContext, { prevAmount, receiptTimestamp }) =>
		(updatedDebt, updateObject) =>
			updateReceiptCacheOnDebtUpdate(
				controllerContext,
				updateObject.receiptId,
				receiptTimestamp,
				[{ ...updatedDebt, deltaAmount: updatedDebt.amount - prevAmount }],
			),
	errorToastOptions: () => (error) => ({
		text: `Error updating debt: ${error.message}`,
	}),
};
