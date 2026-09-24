import { createFileRoute } from "@tanstack/react-router";

import { DebtsScreen } from "~app/features/debts/debts-screen";
import { withDefaultLimit } from "~app/utils/store/limit";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/debts/")({
	component: DebtsScreen,
	...searchParamsWithDefaults("/_protected/debts/"),
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = await getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			() =>
				ctx.context.queryClient.fetchQuery(
					trpc.debts.getPeersPaged.queryOptions({
						limit: withDefaultLimit(ctx.deps.limit, ctx.context),
						cursor: ctx.deps.offset,
						filters: {
							showResolved:
								ctx.context.initialValues[SETTINGS_STORE_NAME]
									.showResolvedDebts,
						},
					}),
				),
			({ items }) =>
				items.map((peerId) => trpc.debts.getAllPeer.queryOptions({ peerId })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "debts") }],
	}),
});
