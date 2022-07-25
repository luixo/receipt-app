import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptItemsId, ReceiptsId } from "next-app/src/db/models";

import { createController } from "../controller";
import { ReceiptItem } from "../types";

const updateReceiptItems = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (items: ReceiptItem[]) => ReceiptItem[]
) =>
	createController(trpc, receiptId).update((prevData) => {
		const nextItems = updater(prevData.items);
		if (nextItems === prevData.items) {
			return prevData;
		}
		return { ...prevData, items: nextItems };
	});

export const add = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	nextReceiptItem: ReceiptItem,
	index = 0
) =>
	updateReceiptItems(trpc, receiptId, (items) => [
		...items.slice(0, index),
		nextReceiptItem,
		...items.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	receiptItemId: ReceiptItemsId
) => {
	const removedReceiptItemRef = createRef<
		{ index: number; receiptItem: ReceiptItem } | undefined
	>();
	updateReceiptItems(trpc, receiptId, (items) => {
		const matchedIndex = items.findIndex((item) => item.id === receiptItemId);
		if (matchedIndex === -1) {
			return items;
		}
		removedReceiptItemRef.current = {
			index: matchedIndex,
			receiptItem: items[matchedIndex]!,
		};
		return [...items.slice(0, matchedIndex), ...items.slice(matchedIndex + 1)];
	});
	return removedReceiptItemRef.current;
};

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	id: ReceiptItemsId,
	updater: (item: ReceiptItem) => ReceiptItem
) => {
	const modifiedReceiptItemRef = createRef<ReceiptItem | undefined>();
	updateReceiptItems(trpc, receiptId, (items) => {
		const matchedIndex = items.findIndex(
			(receiptItem) => receiptItem.id === id
		);
		if (matchedIndex === -1) {
			return items;
		}
		modifiedReceiptItemRef.current = items[matchedIndex]!;
		return [
			...items.slice(0, matchedIndex),
			updater(modifiedReceiptItemRef.current),
			...items.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptItemRef.current;
};
