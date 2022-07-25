import { createController as createReceiptItemsController } from "app/cache/receipt-items/get/controller";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

import * as receiptsPagedGet from "./get-paged/actions";
import * as receiptsGet from "./get/actions";

export const updateReceiptSum = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId
) => {
	const receiptItemsController = createReceiptItemsController(trpc, receiptId);
	const receiptItems = receiptItemsController.get();
	if (!receiptItems) {
		return;
	}
	const nextSum = receiptItems.items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0
	);
	receiptsGet.update(trpc, receiptId, (receipt) => ({
		...receipt,
		sum: nextSum,
	}));
	receiptsPagedGet.update(trpc, receiptId, (receipt) => ({
		...receipt,
		sum: nextSum,
	}));
};
