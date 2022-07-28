import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, ReceiptsResult, Input } from "./types";

const updatePagedReceiptsPages = (
	trpc: TRPCReactContext,
	updater: (
		result: ReceiptsResult,
		resultIndex: number,
		results: ReceiptsResult[],
		input: Input
	) => ReceiptsResult
) =>
	createController(trpc).update(([input, prevData]) => {
		const nextPages = prevData.pages.map((result, index, results) =>
			updater(result, index, results, input)
		);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	updater: (
		page: Receipt[],
		pageIndex: number,
		pages: Receipt[][],
		input: Input
	) => Receipt[]
) =>
	updatePagedReceiptsPages(trpc, (result, index, results, input) => {
		const nextItems = updater(
			result.items,
			index,
			results.map(({ items }) => items),
			input
		);
		if (nextItems === result.items) {
			return result;
		}
		return { ...result, items: nextItems };
	});
