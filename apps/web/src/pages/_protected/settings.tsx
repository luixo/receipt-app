import { createFileRoute } from "@tanstack/react-router";

import { SettingsScreen } from "~app/features/settings/settings-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { prefetchQueries } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/settings")({
	component: SettingsScreen,
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = prefetchQueries(
			ctx,
			trpc.accountSettings.get.queryOptions(),
		);
		await loadNamespaces(ctx.context, "settings");
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "settings") }],
	}),
});
