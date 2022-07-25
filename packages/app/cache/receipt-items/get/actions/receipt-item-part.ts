import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { ReceiptItemsId, ReceiptsId, UsersId } from "next-app/src/db/models";

import { ReceiptItemPart } from "../types";

import { update as updateItem } from "./receipt-item";

const updateReceiptItemParts = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	updater: (itemParts: ReceiptItemPart[]) => ReceiptItemPart[]
) =>
	updateItem(trpc, receiptId, itemId, (receiptItem) => {
		const nextParts = updater(receiptItem.parts);
		if (nextParts === receiptItem.parts) {
			return receiptItem;
		}
		return { ...receiptItem, parts: nextParts };
	});

export const add = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	itemPart: ReceiptItemPart,
	index = 0
) =>
	updateReceiptItemParts(trpc, receiptId, itemId, (parts) => [
		...parts.slice(0, index),
		itemPart,
		...parts.slice(index),
	]);

export const remove = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	userId: UsersId
) => {
	const removedReceiptItemPartRef = createRef<
		{ index: number; receiptItemPart: ReceiptItemPart } | undefined
	>();
	updateReceiptItemParts(trpc, receiptId, itemId, (parts) => {
		const matchedIndex = parts.findIndex((part) => part.userId === userId);
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
	receiptId: ReceiptsId,
	itemId: ReceiptItemsId,
	userId: UsersId,
	updater: (itemPart: ReceiptItemPart) => ReceiptItemPart
) => {
	const modifiedReceiptItemPartRef = createRef<ReceiptItemPart | undefined>();
	updateReceiptItemParts(trpc, receiptId, itemId, (parts) => {
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
