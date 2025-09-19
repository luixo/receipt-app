import { createFileRoute } from "@tanstack/react-router";

import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { withDefaultLimit } from "~app/utils/store/limit";
import {
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	sort: receiptsOrderBySchema.catch("date-desc"),
	filters: receiptsFiltersSchema.catch({}),
	limit: limitSchema.optional().catch(undefined),
	offset: offsetSchema.catch(0),
});

const Wrapper = () => {
	const { useQueryState, useDefaultedQueryState } = getQueryStates(Route);
	return (
		<ReceiptsScreen
			sortState={useQueryState("sort")}
			filtersState={useQueryState("filters")}
			limitState={useDefaultedQueryState("limit", useDefaultLimit())}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/receipts/")({
	component: Wrapper,
	staleTime: Infinity,
	validateSearch,
	search: { middlewares: [stripDefaults] },
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
						limit: withDefaultLimit(ctx.deps.limit, ctx.context),
						orderBy: ctx.deps.sort,
						filters: ctx.deps.filters,
						cursor: ctx.deps.offset,
					}),
				),
			(list) =>
				list.items.map(({ id }) => trpc.receipts.get.queryOptions({ id })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "receipts") }],
	}),
});
