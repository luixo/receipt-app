import { InfiniteData } from "react-query";
import zustand from "zustand";

import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { nonNullishGuard } from "app/utils/utils";
import { ReceiptsId } from "next-app/src/db/models";

type ReceiptsResult = TRPCQueryOutput<"receipts.get-paged">;
type Receipt = ReceiptsResult["items"][number];
export type ReceiptsGetPagedInput =
	TRPCInfiniteQueryInput<"receipts.get-paged">;

export const receiptsGetPagedNextPage = (
	result: ReceiptsResult
): TRPCInfiniteQueryCursor<"receipts.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.issued : undefined;

export const receiptsGetPagedInputStore = zustand<ReceiptsGetPagedInput>(
	(set) => ({
		limit: 10,
		orderBy: "date-desc",
		changeLimit: (nextLimit: ReceiptsGetPagedInput["limit"]) =>
			set(() => ({ limit: nextLimit })),
		changeOrderBy: (nextOrderBy: ReceiptsGetPagedInput["orderBy"]) =>
			set(() => ({ orderBy: nextOrderBy })),
	})
);

const getSortByDate =
	(input: ReceiptsGetPagedInput) => (a: Receipt, b: Receipt) => {
		switch (input.orderBy) {
			case "date-asc":
				return a.issued.valueOf() - b.issued.valueOf();
			case "date-desc":
				return b.issued.valueOf() - a.issued.valueOf();
		}
	};

const getReceiptsGetPagedData = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput
) => trpc.getInfiniteQueryData(["receipts.get-paged", input]);
const setReceiptsGetPagedData = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	data: InfiniteData<ReceiptsResult>
) => trpc.setInfiniteQueryData(["receipts.get-paged", input], data);

const updatePagedReceiptsResult = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (
		prevData: InfiniteData<ReceiptsResult>
	) => InfiniteData<ReceiptsResult>
) => {
	const prevData = getReceiptsGetPagedData(trpc, input);
	if (!prevData) {
		return;
	}
	setReceiptsGetPagedData(trpc, input, updater(prevData));
};

const updatePagedReceiptsPages = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (
		result: ReceiptsResult,
		resultIndex: number,
		results: ReceiptsResult[]
	) => ReceiptsResult
) => {
	updatePagedReceiptsResult(trpc, input, (prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});
};

const updatePagedReceipts = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (page: Receipt[], pageIndex: number, pages: Receipt[][]) => Receipt[]
) => {
	updatePagedReceiptsPages(trpc, input, (result, index, results) => {
		const nextItems = updater(
			result.items,
			index,
			results.map(({ items }) => items)
		);
		if (nextItems === result.items) {
			return result;
		}
		return {
			...result,
			items: nextItems,
		};
	});
};

export const updatePagedReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	receiptId: ReceiptsId,
	updater: (receipt: Receipt) => Receipt
) => {
	let modifiedReceipt: Receipt | undefined;
	updatePagedReceipts(trpc, input, (page) => {
		const matchedReceiptIndex = page.findIndex(
			(receipt) => receipt.id === receiptId
		);
		if (matchedReceiptIndex === -1) {
			return page;
		}
		modifiedReceipt = page[matchedReceiptIndex]!;
		return [
			...page.slice(0, matchedReceiptIndex),
			updater(modifiedReceipt),
			...page.slice(matchedReceiptIndex + 1),
		];
	});
	return modifiedReceipt;
};

export const addPagedReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	nextReceipt: Receipt
) => {
	let shouldShift = false;
	updatePagedReceipts(trpc, input, (page, pageIndex, pages) => {
		if (shouldShift) {
			return [pages[pageIndex - 1]!.at(-1)!, ...page.slice(0, input.limit)];
		}
		const sortedPage = [...page, nextReceipt].sort(getSortByDate(input));
		if (sortedPage.indexOf(nextReceipt) === page.length - 1) {
			if (page.length !== input.limit) {
				shouldShift = true;
				return sortedPage;
			}
			return page;
		}
		shouldShift = true;
		return sortedPage.slice(0, input.limit);
	});
};

export const removePagedReceipt = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	shouldRemove: (receipt: Receipt) => boolean
) => {
	let removedReceipt: Receipt | undefined;
	updatePagedReceipts(trpc, input, (page, pageIndex, pages) => {
		if (removedReceipt) {
			return [...page.slice(1), pages[pageIndex - 1]![0]].filter(
				nonNullishGuard
			);
		}
		const matchedReceiptIndex = page.findIndex(shouldRemove);
		if (matchedReceiptIndex === -1) {
			return page;
		}
		removedReceipt = page[matchedReceiptIndex]!;
		return [
			...page.slice(0, matchedReceiptIndex),
			...page.slice(matchedReceiptIndex + 1),
			pages[pageIndex - 1]![0],
		].filter(nonNullishGuard);
	});
	return removedReceipt;
};
