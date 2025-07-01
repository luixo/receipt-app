import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "~app/features/settings/settings-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/settings")({
	component: SettingsScreen,
	staleTime: Infinity,
	loaderDeps: (ctx) => ({ debug: ctx.search.debug }),
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "settings");
		const trpc = getLoaderTrpcClient(ctx.context, ctx.deps.debug);
		await ctx.context.queryClient.prefetchQuery(
			trpc.accountSettings.get.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "settings") }],
	}),
});
