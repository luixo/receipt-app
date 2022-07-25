import { TRPCReactContext } from "app/trpc";

import { createController } from "./controller";
import { Receipt, ReceiptsResult } from "./types";

const updatePagedReceiptsPages = (
	trpc: TRPCReactContext,
	updater: (
		result: ReceiptsResult,
		resultIndex: number,
		results: ReceiptsResult[]
	) => ReceiptsResult
) =>
	createController(trpc).update((prevData) => {
		const nextPages = prevData.pages.map(updater);
		if (nextPages === prevData.pages) {
			return prevData;
		}
		return { ...prevData, pages: nextPages };
	});

export const updatePagedReceipts = (
	trpc: TRPCReactContext,
	updater: (page: Receipt[], pageIndex: number, pages: Receipt[][]) => Receipt[]
) =>
	updatePagedReceiptsPages(trpc, (result, index, results) => {
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
