import { SyncQueryParamOptions } from "app/hooks/use-sync-query-param";
import { createStore } from "app/utils/store";
import { Setters } from "app/utils/types";

import { Input } from "./types";

type CursorlessOmit = Omit<Input, "cursor">;
type SortType = CursorlessOmit["orderBy"];

export const DEFAULT_SORT: SortType = "date-desc";
export const isOrder = (input: string): input is SortType =>
	["date-asc", "date-desc"].includes(input);

export const orderByOptions: SyncQueryParamOptions<SortType> = {
	param: "sort",
	parse: (input) => (input && isOrder(input) ? input : DEFAULT_SORT),
	serialize: (input) => (input === DEFAULT_SORT ? null : input),
};

export const onlyNonResolvedOptions: SyncQueryParamOptions<boolean> = {
	param: "non-resolved",
	parse: (input) => input === "true",
	serialize: (input) => (input ? "true" : null),
};

export const inputStore = createStore<CursorlessOmit & Setters<CursorlessOmit>>(
	(set) => ({
		limit: 10,
		orderBy: DEFAULT_SORT,
		onlyNonResolved: false,
		changeLimit: (nextLimit) => set(() => ({ limit: nextLimit })),
		changeOrderBy: (nextOrderBy) => set(() => ({ orderBy: nextOrderBy })),
		changeOnlyNonResolved: (nextOnlyNonResolved) =>
			set(() => ({
				onlyNonResolved: nextOnlyNonResolved,
			})),
	}),
	(query) => ({
		orderBy: orderByOptions.parse(query[orderByOptions.param]),
		onlyNonResolved: onlyNonResolvedOptions.parse(
			query[onlyNonResolvedOptions.param]
		),
	})
);

export const useStore = () =>
	[
		inputStore.useStore(({ limit, orderBy, onlyNonResolved }) => ({
			limit,
			orderBy,
			onlyNonResolved,
		})),
		inputStore.useStore(
			({ changeLimit, changeOrderBy, changeOnlyNonResolved }) => ({
				changeLimit,
				changeOrderBy,
				changeOnlyNonResolved,
			})
		),
	] as const;
