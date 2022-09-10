import zustand from "zustand";

import { Setters } from "app/utils/types";

import { Input } from "./types";

type CursorlessOmit = Omit<Input, "cursor">;

export const DEFAULT_SORT: CursorlessOmit["orderBy"] = "date-desc";
export const isOrder = (input: string): input is CursorlessOmit["orderBy"] =>
	["date-asc", "date-desc"].includes(input);

export const orderByOptions = {
	parse: (input: string | null) =>
		input && isOrder(input) ? input : DEFAULT_SORT,
	serialize: (input: CursorlessOmit["orderBy"]) =>
		input === DEFAULT_SORT ? null : input,
};

export const onlyNonResolvedOptions = {
	parse: (input: string | null) => input === "true",
	serialize: (input: CursorlessOmit["onlyNonResolved"]) =>
		input ? "true" : null,
};

export const inputStore = zustand<CursorlessOmit & Setters<CursorlessOmit>>(
	(set) => ({
		limit: 10,
		orderBy: DEFAULT_SORT,
		onlyNonResolved: false,
		changeLimit: (nextLimit: Input["limit"]) =>
			set(() => ({ limit: nextLimit })),
		changeOrderBy: (nextOrderBy: Input["orderBy"]) =>
			set(() => ({ orderBy: nextOrderBy })),
		changeOnlyNonResolved: (nextOnlyNonResolved) =>
			set(() => ({
				onlyNonResolved: nextOnlyNonResolved,
			})),
	})
);

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
