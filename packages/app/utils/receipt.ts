import { cache, Cache } from "app/cache";
import { TRPCReactContext } from "app/trpc";

const calculateReceiptSum = (
	trpc: TRPCReactContext,
	input: Cache.ReceiptItems.Get.Input
) => {
	const receiptItems = trpc.getQueryData(["receipt-items.get", input]);
	if (!receiptItems) {
		return;
	}
	return receiptItems.items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0
	);
};

export const updateReceiptSum = (
	trpc: TRPCReactContext,
	input: Cache.ReceiptItems.Get.Input
) => {
	const nextSum = calculateReceiptSum(trpc, input);
	if (nextSum) {
		const receiptInput: Cache.Receipts.Get.Input = { id: input.receiptId };
		cache.receipts.get.update(trpc, receiptInput, (receipt) => ({
			...receipt,
			sum: nextSum,
		}));
	}
};
