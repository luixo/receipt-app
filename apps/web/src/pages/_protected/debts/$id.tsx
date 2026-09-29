import { createFileRoute } from "@tanstack/react-router";

import { DebtScreen } from "#app/features/debt/debt-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/debts/$id")({
	component: DebtScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const debt = await ctx.context.queryClient.fetchQuery(
			trpc.debts.get.queryOptions({ id: ctx.params.id }),
		);
		await ctx.context.queryClient.prefetchQuery(
			trpc.peers.get.queryOptions({ id: debt.peerId }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "debt") }],
	}),
});
