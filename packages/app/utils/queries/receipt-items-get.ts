import { TRPCQueryInput, TRPCQueryOutput, TRPCReactContext } from "app/trpc";
import { ReceiptItemsId, UsersId } from "next-app/src/db/models";

type ReceiptItemsResult = TRPCQueryOutput<"receipt-items.get">;
type ReceiptItem = ReceiptItemsResult["items"][number];
type ReceiptParticipant = ReceiptItemsResult["participants"][number];
type ReceiptItemPart = ReceiptItem["parts"][number];
export type ReceiptItemsGetInput = TRPCQueryInput<"receipt-items.get">;

const getReceiptItemsData = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput
) => trpc.getQueryData(["receipt-items.get", input]);
const setReceiptItemsData = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	data: ReceiptItemsResult
) => trpc.setQueryData(["receipt-items.get", input], data);

const updateReceiptItemsResult = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (data: ReceiptItemsResult) => ReceiptItemsResult
) => {
	const prevData = getReceiptItemsData(trpc, input);
	if (!prevData) {
		return;
	}
	setReceiptItemsData(trpc, input, updater(prevData));
};

const updateReceiptItems = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (items: ReceiptItem[]) => ReceiptItem[]
) => {
	updateReceiptItemsResult(trpc, input, (prevData) => {
		const nextItems = updater(prevData.items);
		if (nextItems === prevData.items) {
			return prevData;
		}
		return {
			...prevData,
			items: nextItems,
		};
	});
};

export const addReceiptItem = (
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

export const removeReceiptItem = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	shouldRemove: (item: ReceiptItem) => boolean
) => {
	let removedReceiptItem:
		| { index: number; receiptItem: ReceiptItem }
		| undefined;
	updateReceiptItems(trpc, input, (items) => {
		const matchedIndex = items.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return items;
		}
		removedReceiptItem = {
			index: matchedIndex,
			receiptItem: items[matchedIndex]!,
		};
		return [...items.slice(0, matchedIndex), ...items.slice(matchedIndex + 1)];
	});
	return removedReceiptItem;
};

export const updateReceiptItem = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	id: ReceiptItemsId,
	updater: (item: ReceiptItem) => ReceiptItem
) => {
	let modifiedReceiptItem: ReceiptItem | undefined;
	updateReceiptItems(trpc, input, (items) => {
		const matchedIndex = items.findIndex(
			(receiptItem) => receiptItem.id === id
		);
		if (matchedIndex === -1) {
			return items;
		}
		modifiedReceiptItem = items[matchedIndex]!;
		return [
			...items.slice(0, matchedIndex),
			updater(modifiedReceiptItem),
			...items.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptItem;
};

const updateReceiptParticipants = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	updater: (participants: ReceiptParticipant[]) => ReceiptParticipant[]
) => {
	updateReceiptItemsResult(trpc, input, (prevData) => {
		const nextParticipants = updater(prevData.participants);
		if (nextParticipants === prevData.participants) {
			return prevData;
		}
		return {
			...prevData,
			participants: nextParticipants,
		};
	});
};

export const addReceiptParticipant = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	nextReceiptParticipant: ReceiptParticipant,
	index = 0
) =>
	updateReceiptParticipants(trpc, input, (items) => [
		...items.slice(0, index),
		nextReceiptParticipant,
		...items.slice(index),
	]);

export const removeReceiptParticipant = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	shouldRemove: (participant: ReceiptParticipant) => boolean
) => {
	let removedReceiptParticipant:
		| { index: number; receiptParticipant: ReceiptParticipant }
		| undefined;
	updateReceiptParticipants(trpc, input, (participants) => {
		const matchedIndex = participants.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return participants;
		}
		removedReceiptParticipant = {
			index: matchedIndex,
			receiptParticipant: participants[matchedIndex]!,
		};
		return [
			...participants.slice(0, matchedIndex),
			...participants.slice(matchedIndex + 1),
		];
	});
	return removedReceiptParticipant;
};

export const updateReceiptParticipant = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	userId: UsersId,
	updater: (participant: ReceiptParticipant) => ReceiptParticipant
) => {
	let modifiedReceiptParticipant: ReceiptParticipant | undefined;
	updateReceiptParticipants(trpc, input, (items) => {
		const matchedIndex = items.findIndex(
			(participant) => participant.userId === userId
		);
		if (matchedIndex === -1) {
			return items;
		}
		modifiedReceiptParticipant = items[matchedIndex]!;
		return [
			...items.slice(0, matchedIndex),
			updater(modifiedReceiptParticipant),
			...items.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptParticipant;
};

const updateReceiptItemParts = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	updater: (itemParts: ReceiptItemPart[]) => ReceiptItemPart[]
) => {
	updateReceiptItem(trpc, input, itemId, (receiptItem) => {
		const nextParts = updater(receiptItem.parts);
		if (nextParts === receiptItem.parts) {
			return receiptItem;
		}
		return { ...receiptItem, parts: nextParts };
	});
};

export const addReceiptItemPart = (
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

export const removeReceiptItemPart = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	shouldRemove: (part: ReceiptItemPart) => boolean
) => {
	let removedReceiptItemPart:
		| { index: number; receiptItemPart: ReceiptItemPart }
		| undefined;
	updateReceiptItemParts(trpc, input, itemId, (parts) => {
		const matchedIndex = parts.findIndex(shouldRemove);
		if (matchedIndex === -1) {
			return parts;
		}
		removedReceiptItemPart = {
			index: matchedIndex,
			receiptItemPart: parts[matchedIndex]!,
		};
		return [...parts.slice(0, matchedIndex), ...parts.slice(matchedIndex + 1)];
	});
	return removedReceiptItemPart;
};

export const updateReceiptItemPart = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	userId: UsersId,
	updater: (itemPart: ReceiptItemPart) => ReceiptItemPart
) => {
	let modifiedReceiptItemPart: ReceiptItemPart | undefined;
	updateReceiptItemParts(trpc, input, itemId, (parts) => {
		const matchedIndex = parts.findIndex((part) => part.userId === userId);
		if (matchedIndex === -1) {
			return parts;
		}
		modifiedReceiptItemPart = parts[matchedIndex]!;
		return [
			...parts.slice(0, matchedIndex),
			updater(modifiedReceiptItemPart),
			...parts.slice(matchedIndex + 1),
		];
	});
	return modifiedReceiptItemPart;
};
