import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import {
	DEFAULT_LIMIT,
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		sort: receiptsOrderBySchema,
		filters: receiptsFiltersSchema,
		limit: limitSchema,
		offset: offsetSchema,
	}),
	{
		sort: "date-desc",
		filters: {},
		limit: DEFAULT_LIMIT,
		offset: 0,
	},
);

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return (
		<ReceiptsScreen
			sortState={useQueryState("sort")}
			filtersState={useQueryState("filters")}
			limitState={useQueryState("limit")}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/receipts/")({
	component: Wrapper,
	staleTime: Infinity,
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	loaderDeps: ({ search: { offset, limit, filters, sort } }) => ({
		offset,
		limit,
		filters,
		sort,
	}),
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "receipts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			() =>
				ctx.context.queryClient.fetchQuery(
					trpc.receipts.getPaged.queryOptions({
						limit: ctx.deps.limit,
						orderBy: ctx.deps.sort,
						filters: ctx.deps.filters,
						cursor: ctx.deps.offset,
					}),
				),
			(list) => list.items.map((id) => trpc.receipts.get.queryOptions({ id })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "receipts") }],
	}),
});
