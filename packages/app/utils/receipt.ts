import { TRPCReactContext } from "app/trpc";
import { ReceiptItemsGetInput } from "app/utils/queries/receipt-items";
import {
	ReceiptsGetInput,
	updateReceipt,
} from "app/utils/queries/receipts-get";

const calculateReceiptSum = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput
) => {
	const receiptItems = trpc.getQueryData(["receipt-items.get", input]);
	if (!receiptItems) {
		return;
	}
	return receiptItems.items
		.reduce((acc, item) => acc + item.price * item.quantity, 0)
		.toString();
};

export const updateReceiptSum = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput
) => {
	const nextSum = calculateReceiptSum(trpc, input);
	if (nextSum) {
		const receiptInput: ReceiptsGetInput = { id: input.receiptId };
		updateReceipt(trpc, receiptInput, (receipt) => ({
			...receipt,
			sum: nextSum,
		}));
	}
};
