import { createFileRoute } from "@tanstack/react-router";

import { DebtScreen } from "~app/features/debt/debt-screen";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => {
	const { id } = Route.useParams();
	return <DebtScreen id={id} />;
};

export const Route = createFileRoute("/_protected/debts/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const debt = await ctx.context.queryClient.fetchQuery(
			trpc.debts.get.queryOptions({ id: ctx.params.id }),
		);
		await ctx.context.queryClient.prefetchQuery(
			trpc.users.get.queryOptions({ id: debt.userId }),
		);
	},
	head: ({ match }) => ({ meta: [{ title: getTitle(match.context, "debt") }] }),
});
