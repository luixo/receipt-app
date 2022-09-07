import zustand from "zustand";

import { Setters } from "app/utils/types";

import { Input } from "./types";

type CursorlessOmit = Omit<Input, "cursor">;

const inputStore = zustand<CursorlessOmit & Setters<CursorlessOmit>>((set) => ({
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
