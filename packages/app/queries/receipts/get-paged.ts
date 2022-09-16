import { cache } from "app/cache";
import { SyncQueryParamOptions } from "app/hooks/use-sync-query-param";
import { UseContextedQueryOptions } from "app/hooks/use-trpc-query-options";
import { TRPCQueryInput } from "app/trpc";
import { createStore } from "app/utils/store";
import { Setters } from "app/utils/types";
import { noop } from "app/utils/utils";

type Input = TRPCQueryInput<"receipts.getPaged">;

type CursorlessOmit = Omit<Input, "cursor">;
type SortType = CursorlessOmit["orderBy"];

const DEFAULT_SORT: SortType = "date-desc";
const isOrder = (input: string): input is SortType =>
	["date-asc", "date-desc"].includes(input);

const orderByQueryOptions: SyncQueryParamOptions<SortType> = {
	param: "sort",
	parse: (input) => (input && isOrder(input) ? input : DEFAULT_SORT),
	serialize: (input) => (input === DEFAULT_SORT ? null : input),
};

const onlyNonResolvedQueryOptions: SyncQueryParamOptions<boolean> = {
	param: "non-resolved",
	parse: (input) => input === "true",
	serialize: (input) => (input ? "true" : null),
};

export const queryOptions = {
	orderBy: orderByQueryOptions,
	onlyNonResolved: onlyNonResolvedQueryOptions,
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
		orderBy: orderByQueryOptions.parse(query[orderByQueryOptions.param]),
		onlyNonResolved: onlyNonResolvedQueryOptions.parse(
			query[onlyNonResolvedQueryOptions.param]
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

export const options: UseContextedQueryOptions<"receipts.getPaged"> = {
	onSuccess: (trpcContext) => (data) => {
		data.items.forEach((receipt) => {
			cache.receipts.update(trpcContext, {
				get: noop,
				getName: (controller) => controller.upsert(receipt.id, receipt.name),
				getPaged: noop,
				getNonResolvedAmount: noop,
				getResolvedParticipants: noop,
			});
		});
	},
};
