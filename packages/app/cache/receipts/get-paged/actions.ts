import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { ReceiptsId } from "next-app/src/db/models";

import { createController } from "./controller";
import { Receipt, Input } from "./types";
import { updatePagedReceipts } from "./utils";

export * from "./input";

const getSortByDate = (input: Input) => (a: Receipt, b: Receipt) => {
	switch (input.orderBy) {
		case "date-asc":
			return a.issued.valueOf() - b.issued.valueOf();
		case "date-desc":
			return b.issued.valueOf() - a.issued.valueOf();
	}
};

export const update = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	updater: (receipt: Receipt) => Receipt
) => {
	const modifiedReceiptRef = createRef<Receipt | undefined>();
	updatePagedReceipts(trpc, (page) => {
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return page;
		}
		modifiedReceiptRef.current = page[matchedReceiptIndex]!;
		return [
			...page.slice(0, matchedReceiptIndex),
			updater(modifiedReceiptRef.current),
			...page.slice(matchedReceiptIndex + 1),
		];
	});
	return modifiedReceiptRef.current;
};

export const add = (trpc: TRPCReactContext, nextReceipt: Receipt) => {
	const shiftedAtCursorRef = createRef<number | undefined>();
	updatePagedReceipts(trpc, (page, input) => {
		if (shiftedAtCursorRef.current !== undefined) {
			return page;
		}
		const sortedPage = [...page, nextReceipt].sort(getSortByDate(input));
		const sortedIndex = sortedPage.indexOf(nextReceipt);
		if (sortedIndex === 0) {
			if (input.cursor === 0) {
				shiftedAtCursorRef.current = input.cursor;
				return sortedPage;
			}
			// The beginning of the page - probably should fit on the previous page
			return page;
		}
		if (sortedIndex === sortedPage.length - 1) {
			// The end of the page - probably should fit on the next page
			return page;
		}
		shiftedAtCursorRef.current = input.cursor || 0;
		return sortedPage.slice(0, input.limit);
	});
	return shiftedAtCursorRef.current || 0;
};

export const remove = (trpc: TRPCReactContext, receiptId: ReceiptsId) => {
	const removedReceiptRef = createRef<
		{ data: Receipt; cursor: number } | undefined
	>();
	updatePagedReceipts(trpc, (page, input) => {
		if (removedReceiptRef.current) {
			return page;
		}
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return page;
		}
		removedReceiptRef.current = {
			data: page[matchedReceiptIndex]!,
			cursor: input.cursor || 0,
		};
		return [
			...page.slice(0, matchedReceiptIndex),
			...page.slice(matchedReceiptIndex + 1),
		].filter(nonNullishGuard);
	});
	return removedReceiptRef.current;
};

export const invalidate = (trpc: TRPCReactContext, sinceCursor: number) =>
	createController(trpc).invalidate({
		refetchType: "all",
		predicate: (query) => {
			const input = query.queryKey[1] as Input;
			const localCursor = input.cursor || 0;
			return localCursor >= sinceCursor;
		},
	});
