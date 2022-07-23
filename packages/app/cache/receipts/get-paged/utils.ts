import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, ReceiptsGetPagedInput, ReceiptsResult } from "./types";

const updatePagedReceiptsPages = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (
		result: ReceiptsResult,
		resultIndex: number,
		results: ReceiptsResult[]
	) => ReceiptsResult
) =>
	createController(trpc, input).update((prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	input: ReceiptsGetPagedInput,
	updater: (page: Receipt[], pageIndex: number, pages: Receipt[][]) => Receipt[]
) =>
	updatePagedReceiptsPages(trpc, input, (result, index, results) => {
		const nextItems = updater(
			result.items,
			index,
			results.map(({ items }) => items)
		);
		if (nextItems === result.items) {
			return result;
		}
		return { ...result, items: nextItems };
	});
