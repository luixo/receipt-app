import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<
	"receipts.updateDebt",
	{ prevAmount: number }
> = {
	onSuccess:
		(trpcContext, { prevAmount }) =>
		(updatedDebt, updateObject) =>
			updateReceiptCacheOnDebtUpdate(
				trpcContext,
				updateObject.receiptId,
				[{ ...updatedDebt, deltaAmount: updatedDebt.amount - prevAmount }],
				updateObject.updateIntention
			),
};
