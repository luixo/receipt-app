import { createFileRoute } from "@tanstack/react-router";

import { ConnectionIntentionsScreen } from "#app/features/connection-intentions/connection-intentions-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/peers/connections")({
	component: ConnectionIntentionsScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("peers");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.userConnectionIntentions.getAll.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "peersConnections") }],
	}),
});
