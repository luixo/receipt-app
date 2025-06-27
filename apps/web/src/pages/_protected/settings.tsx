import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "~app/features/settings/settings-screen";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/settings")({
	component: SettingsScreen,
	head: () => ({ meta: [{ title: "RA - Settings" }] }),
	loaderDeps: (ctx) => ({ debug: ctx.search.debug }),
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context.queryClient, ctx.deps.debug);
		await ctx.context.queryClient.prefetchQuery(
			trpc.accountSettings.get.queryOptions(),
		);
	},
});
