import zustand from "zustand";

import { TRPCInfiniteQueryCursor } from "app/trpc";
import { Setters } from "app/utils/types";

import { ReceiptsResult, Input } from "./types";

export const getNextPage = (
	result: ReceiptsResult
): TRPCInfiniteQueryCursor<"receipts.getPaged"> =>
	result.hasMore ? result.items[result.items.length - 1]?.issued : undefined;

const inputStore = zustand<Input & Setters<Input>>((set) => ({
	limit: 10,
	orderBy: "date-desc",
	onlyNonResolved: false,
	changeLimit: (nextLimit: Input["limit"]) => set(() => ({ limit: nextLimit })),
	changeOrderBy: (nextOrderBy: Input["orderBy"]) =>
		set(() => ({ orderBy: nextOrderBy })),
	changeOnlyNonResolved: (nextOnlyNonResolved) =>
		set(() => ({
			onlyNonResolved: nextOnlyNonResolved,
		})),
}));

export const useStore = () =>
	[
		inputStore(({ limit, orderBy, onlyNonResolved }) => ({
			limit,
			orderBy,
			onlyNonResolved,
		})),
		inputStore(({ changeLimit, changeOrderBy, changeOnlyNonResolved }) => ({
			changeLimit,
			changeOrderBy,
			changeOnlyNonResolved,
		})),
	] as const;
