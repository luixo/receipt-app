import { createFileRoute } from "@tanstack/react-router";

import { DebtsIntentionsScreen } from "~app/features/debts-intentions/debts-intentions-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

export const Route = createFileRoute("/_protected/debts/intentions")({
	component: DebtsIntentionsScreen,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.fetchQuery(
			trpc.debtIntentions.getAll.queryOptions(),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "debtsIntentions") }],
	}),
});
