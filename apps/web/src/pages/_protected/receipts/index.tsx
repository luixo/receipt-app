import { createFileRoute } from "@tanstack/react-router";

import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { withDefaultLimit } from "~app/utils/store/limit";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/receipts/")({
	component: ReceiptsScreen,
	staleTime: Infinity,
	...searchParamsWithDefaults("/_protected/receipts/"),
	loaderDeps: ({ search: { offset, limit, filters, sort } }) => ({
		offset,
		limit,
		filters,
		sort,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("receipts");
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
		meta: [{ title: getTitle(match.context.i18nContext, "receipts") }],
	}),
});
