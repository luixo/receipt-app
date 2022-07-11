import { ReceiptItemsId } from "next-app/src/db/models";

import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "../../trpc";

type ReceiptItem = TRPCQueryOutput<"receipt-items.get">["items"][number];
export type ReceiptItemsGetInput = TRPCQueryInput<"receipt-items.get">;

export const getReceiptItemWithIndexById = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
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
	input: ReceiptItemsGetInput,
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

export const updateReceiptItemById = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	updater: (item: ReceiptItem) => ReceiptItem
) =>
	updateReceiptItems(trpc, input, (items) => {
		const itemIndex = items.findIndex((item) => item.id === itemId);
		if (itemIndex === -1) {
			return items;
		}
		return [
			...items.slice(0, itemIndex),
			updater(items[itemIndex]!),
			...items.slice(itemIndex + 1),
		];
	});
