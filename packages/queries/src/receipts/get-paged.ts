import type { TRPCQueryInput } from "~app/trpc";
import { updateSetStateAction } from "~utils";

import { createStore } from "../store";
import type { Setters } from "../types";
import type { SyncQueryParamOptions } from "../use-sync-query-param";
import { useSyncQueryParam } from "../use-sync-query-param";

type Input = TRPCQueryInput<"receipts.getPaged">;

type CursorlessInput = Omit<Input, "cursor">;
type SortType = CursorlessInput["orderBy"];

const DEFAULT_SORT: SortType = "date-desc";
const isOrder = (input: string): input is SortType =>
	["date-asc", "date-desc"].includes(input);

const orderByQueryOptions: SyncQueryParamOptions<SortType> = {
	param: "sort",
	parse: (input) => (input && isOrder(input) ? input : DEFAULT_SORT),
	serialize: (input) => (input === DEFAULT_SORT ? null : input),
};

const getOptionalBooleanOptions = (
	param: string,
): SyncQueryParamOptions<boolean | undefined> => ({
	param,
	parse: (input) =>
		input === "true" ? true : input === "false" ? false : undefined,
	serialize: (input) => (typeof input === "boolean" ? input.toString() : null),
});

const getFilters = (
	filters: CursorlessInput["filters"],
): CursorlessInput["filters"] => {
	if (
		!filters ||
		// Enabling `exactOptionalPropertyTypes` in tsconfig fixes that
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		Object.values(filters).filter((value) => value !== undefined).length === 0
	) {
		return;
	}
	return filters;
};

const queryOptions = {
	orderBy: orderByQueryOptions,
	filters: {
		resolvedByMe: getOptionalBooleanOptions("filters.resolvedByMe"),
		ownedByMe: getOptionalBooleanOptions("filters.ownedByMe"),
		locked: getOptionalBooleanOptions("filters.locked"),
	},
};

export const inputStore = createStore<
	CursorlessInput & Setters<CursorlessInput>
>(
	(set) => ({
		limit: 10,
		orderBy: DEFAULT_SORT,
		changeLimit: (setStateAction) =>
			set((prev) => ({
				limit: updateSetStateAction(setStateAction, prev.limit),
			})),
		changeOrderBy: (setStateAction) =>
			set((prev) => ({
				orderBy: updateSetStateAction(setStateAction, prev.orderBy),
			})),
		changeFilters: (setStateAction) =>
			set((prev) => ({
				filters: getFilters(updateSetStateAction(setStateAction, prev.filters)),
			})),
	}),
	(query) => ({
		orderBy: queryOptions.orderBy.parse(query[queryOptions.orderBy.param]),
		filters: getFilters({
			resolvedByMe: queryOptions.filters.resolvedByMe.parse(
				query[queryOptions.filters.resolvedByMe.param],
			),
			ownedByMe: queryOptions.filters.ownedByMe.parse(
				query[queryOptions.filters.ownedByMe.param],
			),
			locked: queryOptions.filters.locked.parse(
				query[queryOptions.filters.locked.param],
			),
		}),
	}),
);

export const useStore = () =>
	[
		inputStore.useStore(({ limit, orderBy, filters }) => ({
			limit,
			orderBy,
			filters,
		})),
		inputStore.useStore(({ changeLimit, changeOrderBy, changeFilters }) => ({
			changeLimit,
			changeOrderBy,
			changeFilters,
		})),
	] as const;

export const useSyncQueryParams = () => {
	const [{ orderBy, filters = {} }] = useStore();
	useSyncQueryParam(queryOptions.filters.resolvedByMe, filters.resolvedByMe);
	useSyncQueryParam(queryOptions.filters.ownedByMe, filters.ownedByMe);
	useSyncQueryParam(queryOptions.filters.locked, filters.locked);
	useSyncQueryParam(queryOptions.orderBy, orderBy);
};
