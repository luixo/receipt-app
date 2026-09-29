import { createFileRoute } from "@tanstack/react-router";

import { PeersScreen } from "#app/features/peers/peers-screen.tsx";
import { withDefaultLimit } from "#app/utils/store/limit.ts";
import { getTitle } from "#web/utils/i18n.ts";
import { searchParamsWithDefaults } from "#web/utils/navigation.ts";
import { prefetchQueriesWith } from "#web/utils/ssr.tsx";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/peers/")({
	component: PeersScreen,
	...searchParamsWithDefaults("/_protected/peers/"),
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("peers");
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			() =>
				ctx.context.queryClient.fetchQuery(
					trpc.peers.getPaged.queryOptions({
						limit: withDefaultLimit(ctx.deps.limit, ctx.context),
						cursor: ctx.deps.offset,
					}),
				),
			(list) => list.items.map((id) => trpc.peers.get.queryOptions({ id })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "peers") }],
	}),
});
