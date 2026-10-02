import type { Receipt, ReceiptItem } from "~app/trpc-types";

export const getReceiptDebtName = (receiptName: string) =>
	`Receipt "${receiptName}"`;

export const getReceiptItems = (
	receipt: Pick<Receipt, "mode" | "singleItem" | "multipleItems">,
): ReceiptItem[] =>
	receipt.mode === "single"
		? receipt.singleItem
			? [receipt.singleItem]
			: []
		: receipt.multipleItems;
