import { createRef } from "app/cache/utils";
import { TRPCReactContext } from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { ReceiptsId } from "next-app/src/db/models";

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
	const shouldShiftRef = createRef(false);
	updatePagedReceipts(trpc, (page, pageIndex, pages, input) => {
		if (shouldShiftRef.current) {
			const prevPage = pages[pageIndex - 1];
			if (!prevPage) {
				return [];
			}
			return [prevPage.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextReceipt].sort(getSortByDate(input));
		if (sortedPage.indexOf(nextReceipt) === page.length - 1) {
			if (page.length !== input.limit) {
				shouldShiftRef.current = true;
				return sortedPage;
			}
			return page;
		}
		shouldShiftRef.current = true;
		return sortedPage.slice(0, input.limit);
	});
};

export const remove = (trpc: TRPCReactContext, receiptId: ReceiptsId) => {
	const removedReceiptRef = createRef<Receipt | undefined>();
	updatePagedReceipts(trpc, (page, pageIndex, pages) => {
		if (removedReceiptRef.current) {
			return [...page.slice(1), pages[pageIndex + 1]?.[0]].filter(
				nonNullishGuard
			);
		}
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return page;
		}
		removedReceiptRef.current = page[matchedReceiptIndex]!;
		return [
			...page.slice(0, matchedReceiptIndex),
			...page.slice(matchedReceiptIndex + 1),
			pages[pageIndex + 1]?.[0],
		].filter(nonNullishGuard);
	});
	return removedReceiptRef.current;
};
