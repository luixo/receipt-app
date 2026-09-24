import { createFileRoute } from "@tanstack/react-router";

import { PeerDebtsScreen } from "~app/features/peer-debts/peer-debts-screen";
import { withDefaultLimit } from "~app/utils/store/limit";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/debts/peer/$id/")({
	component: PeerDebtsScreen,
	...searchParamsWithDefaults("/_protected/debts/peer/$id/"),
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = await getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			async () => {
				const [peerPaged] = await Promise.all([
					ctx.context.queryClient.fetchQuery(
						trpc.debts.getByPeerPaged.queryOptions({
							peerId: ctx.params.id,
							limit: withDefaultLimit(ctx.deps.limit, ctx.context),
							cursor: ctx.deps.offset,
							filters: {
								showResolved:
									ctx.context.initialValues[SETTINGS_STORE_NAME]
										.showResolvedDebts,
							},
						}),
					),
					ctx.context.queryClient.fetchQuery(
						trpc.debts.getAllPeer.queryOptions({ peerId: ctx.params.id }),
					),
				]);
				return peerPaged;
			},
			({ items }) =>
				items.map((debtId) => trpc.debts.get.queryOptions({ id: debtId })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "peerDebts") }],
	}),
});
