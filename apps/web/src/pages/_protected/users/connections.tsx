import { createFileRoute } from "@tanstack/react-router";

import { ConnectionIntentionsScreen } from "~app/features/connection-intentions/connection-intentions-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/users/connections")({
	component: ConnectionIntentionsScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.accountConnectionIntentions.getAll.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "usersConnections") }],
	}),
});
