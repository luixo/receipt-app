import { cache } from "app/cache";
import { TRPCReactContext } from "app/trpc";
import { ReceiptsId } from "next-app/db/models";

export const updateReceiptSum = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId
) => {
	const receiptItems = cache.receiptItems.get.all.get(trpc, receiptId);
	if (!receiptItems) {
		return;
	}
	const nextSum = receiptItems.items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0
	);
	cache.receipts.get.update(trpc, receiptId, (receipt) => ({
		...receipt,
		sum: nextSum,
	}));
	cache.receipts.getPaged.update(trpc, receiptId, (receipt) => ({
		...receipt,
		sum: nextSum,
	}));
};
