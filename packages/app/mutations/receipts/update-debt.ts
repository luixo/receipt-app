import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<
	"receipts.updateDebt",
	{ prevAmount: number; receiptTimestamp: Date }
> = {
	onSuccess:
		(trpcContext, { prevAmount, receiptTimestamp }) =>
		(updatedDebt, updateObject) =>
			updateReceiptCacheOnDebtUpdate(
				trpcContext,
				updateObject.receiptId,
				receiptTimestamp,
				[{ ...updatedDebt, deltaAmount: updatedDebt.amount - prevAmount }],
				updateObject.updateIntention,
			),
	errorToastOptions: () => (error) => ({
		text: `Error updating debt: ${error.message}`,
	}),
};
