import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "../debt-utils";

export const mutationOptions: UseContextedMutationOptions<"receipts.propagate-debts"> =
	{
		onSuccess: (trpcContext) => (updatedDebts, updateObject) => {
			updateReceiptCacheOnDebtUpdate(
				trpcContext,
				updateObject.receiptId,
				updatedDebts,
				true
			);
		},
	};
