import zustand from "zustand";

import {
	ReceiptsGetPagedCursor,
	ReceiptsGetPagedInput,
	ReceiptsResult,
} from "./types";

export const getNextPage = (result: ReceiptsResult): ReceiptsGetPagedCursor =>
	result.hasMore ? result.items[result.items.length - 1]?.issued : undefined;

const inputStore = zustand<ReceiptsGetPagedInput>((set) => ({
	limit: 10,
	orderBy: "date-desc",
	changeLimit: (nextLimit: ReceiptsGetPagedInput["limit"]) =>
		set(() => ({ limit: nextLimit })),
	changeOrderBy: (nextOrderBy: ReceiptsGetPagedInput["orderBy"]) =>
		set(() => ({ orderBy: nextOrderBy })),
}));

export const useStore = () =>
	inputStore((state) => ({
		limit: state.limit,
		orderBy: state.orderBy,
	}));
