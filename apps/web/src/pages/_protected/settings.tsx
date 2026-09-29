import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "#app/features/settings/settings-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { prefetchQueries } from "#web/utils/ssr.tsx";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/settings")({
	component: SettingsScreen,
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = prefetchQueries(
			ctx,
			trpc.userSettings.get.queryOptions(),
		);
		await ctx.context.i18nContext.loadNamespaces("settings");
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "settings") }],
	}),
});
