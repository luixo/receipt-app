import { createFileRoute } from "@tanstack/react-router";

import { PeerScreen } from "~app/features/peer/peer-screen";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/peers/$id")({
	component: PeerScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("peers");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.peers.get.queryOptions({ id: ctx.params.id }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "peer") }],
	}),
});
