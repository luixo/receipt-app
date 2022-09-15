import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<"receipts.updateDebt"> = {
	onSuccess: (trpcContext) => (updatedDebt, updateObject) => {
		updateReceiptCacheOnDebtUpdate(
			trpcContext,
			updateObject.receiptId,
			[updatedDebt],
			updateObject.updateIntention
		);
	},
};
