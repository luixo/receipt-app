import { createFileRoute } from "@tanstack/react-router";

import { UserScreen } from "#app/features/user/user-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/user")({
	component: UserScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("user");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(trpc.user.get.queryOptions());
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "user") }],
	}),
});
