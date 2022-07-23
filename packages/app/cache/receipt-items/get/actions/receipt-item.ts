import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptItemsId } from "next-app/src/db/models";

import { createController } from "../controller";
import { ReceiptItem, ReceiptItemsGetInput } from "../types";

const updateReceiptItems = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (items: ReceiptItem[]) => ReceiptItem[]
) =>
	createController(trpc, input).update((prevData) => {
		const nextItems = updater(prevData.items);
		if (nextItems === prevData.items) {
			return prevData;
		}
		return { ...prevData, items: nextItems };
	});

export const add = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	nextReceiptItem: ReceiptItem,
	index = 0
) =>
	updateReceiptItems(trpc, input, (items) => [
		...items.slice(0, index),
		nextReceiptItem,
		...items.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	shouldRemove: (item: ReceiptItem) => boolean
) => {
	const removedReceiptItemRef = createRef<
		{ index: number; receiptItem: ReceiptItem } | undefined
	>();
	updateReceiptItems(trpc, input, (items) => {
		const matchedIndex = items.findIndex(shouldRemove);
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
	input: ReceiptItemsGetInput,
	id: ReceiptItemsId,
	updater: (item: ReceiptItem) => ReceiptItem
) => {
	const modifiedReceiptItemRef = createRef<ReceiptItem | undefined>();
	updateReceiptItems(trpc, input, (items) => {
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
