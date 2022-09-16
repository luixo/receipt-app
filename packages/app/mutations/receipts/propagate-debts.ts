import { UseContextedMutationOptions } from "app/hooks/use-trpc-mutation-options";

import { updateReceiptCacheOnDebtUpdate } from "./utils";

export const options: UseContextedMutationOptions<"receipts.propagateDebts"> = {
	onSuccess: (trpcContext) => (updatedDebts, updateObject) => ({
		reverFns: updateReceiptCacheOnDebtUpdate(
			trpcContext,
			updateObject.receiptId,
			updatedDebts.map((debt) => ({ ...debt, deltaAmount: debt.amount })),
			true
		),
	}),
};
