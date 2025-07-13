import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeScreen } from "~app/features/debts-exchange/debts-exchange-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtsExchangeScreen userId={id} />;
};

export const Route = createFileRoute("/_protected/debts/user/$id/exchange/")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		await ctx.context.queryClient.prefetchQuery(
			trpc.debts.getAllUser.queryOptions({ userId: ctx.params.id }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "exchangeDebts") }],
	}),
});
