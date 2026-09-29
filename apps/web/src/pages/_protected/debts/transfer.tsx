import { createFileRoute } from "@tanstack/react-router";

import { DebtsTransferScreen } from "#app/features/debts-transfer/debts-transfer-screen.tsx";
import { getTitle } from "#web/utils/i18n.ts";
import { searchParamsWithDefaults } from "#web/utils/navigation.ts";
import { getLoaderTrpcClient } from "#web/utils/trpc.ts";

export const Route = createFileRoute("/_protected/debts/transfer")({
	component: DebtsTransferScreen,
	...searchParamsWithDefaults("/_protected/debts/transfer"),
	loaderDeps: ({ search: { to, from } }) => ({ to, from }),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await Promise.all(
			[ctx.deps.to, ctx.deps.from].map(async (peerId) => {
				if (peerId) {
					await ctx.context.queryClient.fetchQuery(
						trpc.peers.get.queryOptions({ id: peerId }),
					);
				}
			}),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "transferDebts") }],
	}),
});
