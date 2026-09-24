import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/debts/peer/$id/exchange/")({
	component: DebtsExchangeScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = await getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.debts.getAllPeer.queryOptions({ peerId: ctx.params.id }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "exchangeDebts") }],
	}),
});
