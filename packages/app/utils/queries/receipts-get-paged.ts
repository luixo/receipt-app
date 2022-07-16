import {
	TRPCInfiniteQueryCursor,
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "app/trpc";
import { ReceiptsId } from "next-app/src/db/models";

import { InfiniteDataController, updatePagedResult } from "./utils";

type ReceiptsResult = TRPCQueryOutput<"receipts.get-paged">;
type Receipt = ReceiptsResult["items"][number];
export type ReceiptsGetPagedInput =
	TRPCInfiniteQueryInput<"receipts.get-paged">;

export const receiptsGetPagedNextPage = (
	result: ReceiptsResult
): TRPCInfiniteQueryCursor<"receipts.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.issued : undefined;

export const DEFAULT_INPUT: ReceiptsGetPagedInput = {
	limit: 10,
	orderBy: "date-desc",
};

export const getPagedReceiptById = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	receiptId: ReceiptsId
) => {
	const prevData = trpc.getInfiniteQueryData(["receipts.get-paged", input]);
	if (!prevData) {
		return;
	}
	let receiptIndex = -1;
	const pageIndex = prevData.pages.findIndex((page) => {
		receiptIndex = page.items.findIndex((receipt) => receipt.id === receiptId);
		return receiptIndex !== -1;
	});
	const receipt = prevData.pages[pageIndex]?.items[receiptIndex];
	if (!receipt) {
		return;
	}
	return {
		pageIndex,
		receiptIndex,
		receipt,
	};
};

const getReceiptsGetPagedController = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput
): InfiniteDataController<ReceiptsResult> => ({
	getData: () => trpc.getInfiniteQueryData(["receipts.get-paged", input]),
	setData: (data) =>
		trpc.setInfiniteQueryData(["receipts.get-paged", input], data),
});

export const updatePagedReceiptsResult = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (
		result: ReceiptsResult,
		resultIndex: number,
		results: ReceiptsResult[]
	) => ReceiptsResult
) => updatePagedResult(getReceiptsGetPagedController(trpc, input), updater);

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (page: Receipt[], pageIndex: number, pages: Receipt[][]) => Receipt[]
) => {
	updatePagedReceiptsResult(trpc, input, (result, index, results) => {
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
