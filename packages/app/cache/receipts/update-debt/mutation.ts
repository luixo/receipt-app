import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "../debt-utils";

export const mutationOptions: UseContextedMutationOptions<"receipts.updateDebt"> =
	{
		onSuccess: (trpcContext) => (updatedDebt, updateObject) => {
			updateReceiptCacheOnDebtUpdate(
				trpcContext,
				updateObject.receiptId,
				[updatedDebt],
				updateObject.updateIntention
			);
		},
	};
