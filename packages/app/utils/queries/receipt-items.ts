import { ReceiptItemsId } from "next-app/src/db/models";
import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "../../trpc";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
export type ReceiptItemsGetItemsInput = TRPCQueryInput<"receipt-items.get">;

export const getReceiptItemWithIndexById = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetItemsInput,
	itemId: ReceiptItemsId
) => {
	const prevData = trpc.getQueryData(["receipt-items.get", input]);
	if (!prevData) {
		return;
	}
	const index = prevData.items.findIndex((item) => item.id === itemId);
	if (index === -1) {
		return;
	}
	return {
		index,
		item: prevData.items[index]!,
	};
};

export const updateReceiptItems = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetItemsInput,
	updater: (items: ReceiptItem[]) => ReceiptItem[]
) => {
	const prevData = trpc.getQueryData(["receipt-items.get", input]);
	if (!prevData) {
		return;
	}
	const nextItems = updater(prevData.items);
	if (nextItems === prevData.items) {
		return;
	}
	trpc.setQueryData(["receipt-items.get", input], {
		...prevData,
		items: nextItems,
	});
};
