import { ReceiptsId } from "next-app/src/db/models";

import {
	TRPCInfiniteQueryInput,
	TRPCQueryOutput,
	TRPCReactContext,
} from "../../trpc";

type Receipt = TRPCQueryOutput<"receipts.get-paged">[number];
export type ReceiptsGetPagedInput =
	TRPCInfiniteQueryInput<"receipts.get-paged">;

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
		receiptIndex = page.findIndex((receipt) => receipt.id === receiptId);
		return receiptIndex !== -1;
	});
	const receipt = prevData.pages[pageIndex]?.[receiptIndex];
	if (!receipt) {
		return;
	}
	return {
		pageIndex,
		receiptIndex,
		receipt,
	};
};

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (page: Receipt[], pageIndex: number, pages: Receipt[][]) => Receipt[]
) => {
	const prevData = trpc.getInfiniteQueryData(["receipts.get-paged", input]);
	if (!prevData) {
		return;
	}
	const nextPages = prevData.pages.map(updater);
	if (nextPages === prevData.pages) {
		return;
	}
	trpc.setInfiniteQueryData(["receipts.get-paged", input], {
		...prevData,
		pages: nextPages,
	});
};
