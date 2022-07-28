import zustand from "zustand";

import { TRPCInfiniteQueryCursor } from "app/trpc";

import { ReceiptsResult, Input } from "./types";

export const getNextPage = (
	result: ReceiptsResult
): TRPCInfiniteQueryCursor<"receipts.get-paged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.issued : undefined;

const inputStore = zustand<Input>((set) => ({
	limit: 10,
	orderBy: "date-desc",
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
	changeOrderBy: (nextOrderBy: Input["orderBy"]) =>
		set(() => ({ orderBy: nextOrderBy })),
}));

export const useStore = () =>
	inputStore(({ limit, orderBy }) => ({ limit, orderBy }));
