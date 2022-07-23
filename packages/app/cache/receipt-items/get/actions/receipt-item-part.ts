import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptItemsId, UsersId } from "next-app/src/db/models";

import { ReceiptItemPart, ReceiptItemsGetInput } from "../types";

import { update as updateItem } from "./receipt-item";

const updateReceiptItemParts = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	updater: (itemParts: ReceiptItemPart[]) => ReceiptItemPart[]
) =>
	updateItem(trpc, input, itemId, (receiptItem) => {
		const nextParts = updater(receiptItem.parts);
		if (nextParts === receiptItem.parts) {
			return receiptItem;
		}
		return { ...receiptItem, parts: nextParts };
	});

export const add = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	itemPart: ReceiptItemPart,
	index = 0
) =>
	updateReceiptItemParts(trpc, input, itemId, (parts) => [
		...parts.slice(0, index),
		itemPart,
		...parts.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	shouldRemove: (part: ReceiptItemPart) => boolean
) => {
	const removedReceiptItemPartRef = createRef<
		{ index: number; receiptItemPart: ReceiptItemPart } | undefined
	>();
	updateReceiptItemParts(trpc, input, itemId, (parts) => {
		const matchedIndex = parts.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return parts;
		}
		removedReceiptItemPartRef.current = {
			index: matchedIndex,
			receiptItemPart: parts[matchedIndex]!,
		};
		return [...parts.slice(0, matchedIndex), ...parts.slice(matchedIndex + 1)];
	});
	return removedReceiptItemPartRef.current;
};

export const update = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	userId: UsersId,
	updater: (itemPart: ReceiptItemPart) => ReceiptItemPart
) => {
	const modifiedReceiptItemPartRef = createRef<ReceiptItemPart | undefined>();
	updateReceiptItemParts(trpc, input, itemId, (parts) => {
		const matchedIndex = parts.findIndex((part) => part.userId === userId);
		if (matchedIndex === -1) {
			return parts;
		}
		modifiedReceiptItemPartRef.current = parts[matchedIndex]!;
		return [
			...parts.slice(0, matchedIndex),
			updater(modifiedReceiptItemPartRef.current),
			...parts.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptItemPartRef.current;
};
