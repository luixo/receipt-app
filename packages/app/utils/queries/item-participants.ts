import { ReceiptItemsId, UsersId } from "next-app/src/db/models";
import { TRPCQueryOutput, TRPCReactContext } from "../../trpc";
import {
	getReceiptItemWithIndexById,
	ReceiptItemsGetInput,
	updateReceiptItemById,
} from "./receipt-items";

type ReceiptItemPart =
	TRPCQueryOutput<"receipt-items.get">["items"][number]["parts"][number];

export const getReceiptItemPartWithIndex = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	userId: UsersId
) => {
	const receiptItemWithIndex = getReceiptItemWithIndexById(trpc, input, itemId);
	if (!receiptItemWithIndex) {
		return;
	}
	const index = receiptItemWithIndex.item.parts.findIndex(
		(part) => part.userId === userId
	);
	if (index === -1) {
		return;
	}
	return {
		index,
		item: receiptItemWithIndex.item.parts[index]!,
	};
};

export const updateItemParts = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	updater: (parts: ReceiptItemPart[]) => ReceiptItemPart[]
) => {
	return updateReceiptItemById(trpc, input, itemId, (item) => ({
		...item,
		parts: updater(item.parts),
	}));
};

export const updateItemPart = (
	trpc: TRPCReactContext,
	input: ReceiptItemsGetInput,
	itemId: ReceiptItemsId,
	userId: UsersId,
	updater: (part: ReceiptItemPart) => ReceiptItemPart
) => {
	return updateItemParts(trpc, input, itemId, (parts) =>
		parts.map((part) => (part.userId === userId ? updater(part) : part))
	);
};
