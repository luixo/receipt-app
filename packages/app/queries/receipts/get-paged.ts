import type { SyncQueryParamOptions } from "app/hooks/use-sync-query-param";
import { useSyncQueryParam } from "app/hooks/use-sync-query-param";
import type { TRPCQueryInput } from "app/trpc";
import { createStore, updateWithFn } from "app/utils/store";
import type { Setters } from "app/utils/types";

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
		changeLimit: (maybeUpdater) =>
			set((prev) => ({ limit: updateWithFn(prev.limit, maybeUpdater) })),
		changeOrderBy: (maybeUpdater) =>
			set((prev) => ({ orderBy: updateWithFn(prev.orderBy, maybeUpdater) })),
		changeFilters: (maybeUpdater) =>
			set((prev) => ({
				filters: getFilters(updateWithFn(prev.filters, maybeUpdater)),
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
