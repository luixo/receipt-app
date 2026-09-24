import { createFileRoute } from "@tanstack/react-router";

import { DebtsIntentionsScreen } from "~app/features/debts-intentions/debts-intentions-screen";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/debts/intentions")({
	component: DebtsIntentionsScreen,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.fetchQuery(
			trpc.debtIntentions.getAll.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "debtsIntentions") }],
	}),
});
