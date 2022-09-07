import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { alwaysTrue, nonNullishGuard } from "app/utils/utils";
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
	updatePagedReceipts(trpc, (page, count) => {
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return [page, count];
		}
		modifiedReceiptRef.current = page[matchedReceiptIndex]!;
		return [
			[
				...page.slice(0, matchedReceiptIndex),
				updater(modifiedReceiptRef.current),
				...page.slice(matchedReceiptIndex + 1),
			],
			count,
		];
	});
	return modifiedReceiptRef.current;
};

export const add = (trpc: TRPCReactContext, nextReceipt: Receipt) => {
	const shiftedAtCursorRef = createRef<number | undefined>();
	updatePagedReceipts(trpc, (page, count, input) => {
		if (shiftedAtCursorRef.current !== undefined) {
			return [page, count + 1];
		}
		const sortedPage = [...page, nextReceipt].sort(getSortByDate(input));
		const sortedIndex = sortedPage.indexOf(nextReceipt);
		if (sortedIndex === 0) {
			if (input.cursor === 0) {
				shiftedAtCursorRef.current = input.cursor;
				return [sortedPage, count + 1];
			}
			// The beginning of the page - probably should fit on the previous page
			return [page, count];
		}
		if (sortedIndex === sortedPage.length - 1) {
			// The end of the page - probably should fit on the next page
			return [page, count];
		}
		shiftedAtCursorRef.current = input.cursor;
		return [sortedPage.slice(0, input.limit), count + 1];
	});
	return shiftedAtCursorRef.current;
};

export const remove = (
	trpc: TRPCReactContext,
	receiptId: ReceiptsId,
	inputPredicate: (input: Input) => boolean = alwaysTrue
) => {
	const removedReceiptRef = createRef<
		{ data: Receipt; cursor?: number } | undefined
	>();
	updatePagedReceipts(trpc, (page, count, input) => {
		if (!inputPredicate(input)) {
			return [page, count];
		}
		if (removedReceiptRef.current) {
			return [page, count - 1];
		}
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return [page, count];
		}
		removedReceiptRef.current = {
			data: page[matchedReceiptIndex]!,
			cursor: input.cursor,
		};
		return [
			[
				...page.slice(0, matchedReceiptIndex),
				...page.slice(matchedReceiptIndex + 1),
			].filter(nonNullishGuard),
			count - 1,
		];
	});
	return removedReceiptRef.current;
};

export const invalidate = (
	trpc: TRPCReactContext,
	sinceCursor: number = 0,
	inputPredicate: (input: Input) => boolean = alwaysTrue
) =>
	createController(trpc).invalidate({
		refetchType: "all",
		predicate: (query) => {
			const input = query.queryKey[1] as Input;
			if (!inputPredicate(input)) {
				return false;
			}
			return input.cursor >= sinceCursor;
		},
	});
