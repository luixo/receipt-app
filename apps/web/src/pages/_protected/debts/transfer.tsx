import { createFileRoute } from "@tanstack/react-router";

import { DebtsTransferScreen } from "~app/features/debts-transfer/debts-transfer-screen";
import { searchParamsMapping } from "~app/utils/navigation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults(
	searchParamsMapping["/debts/transfer"],
);

export const Route = createFileRoute("/_protected/debts/transfer")({
	component: DebtsTransferScreen,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loaderDeps: ({ search: { to, from } }) => ({ to, from }),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await Promise.all(
			[ctx.deps.to, ctx.deps.from].map(async (userId) => {
				if (userId) {
					await ctx.context.queryClient.fetchQuery(
						trpc.users.get.queryOptions({ id: userId }),
					);
				}
			}),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "transferDebts") }],
	}),
});
