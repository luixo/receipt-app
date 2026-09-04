import { createFileRoute } from "@tanstack/react-router";

import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";

// No SSR prefetch here: the list now loads via an eagerly-synced TanStack DB
// collection (see `~app/features/receipts/use-receipts-list-page`), which
// loads the whole matching set client-side rather than a single server page
// -- there's no longer a single-page `receipts.getPaged` call to prefetch.
export const Route = createFileRoute("/_protected/receipts/")({
	component: ReceiptsScreen,
	staleTime: Infinity,
	...searchParamsWithDefaults("/_protected/receipts/"),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("receipts");
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "receipts") }],
	}),
});
