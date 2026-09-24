import { createFileRoute } from "@tanstack/react-router";

import { AccountScreen } from "~app/features/account/account-screen";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/account")({
	component: AccountScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("account");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.account.get.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "account") }],
	}),
});
