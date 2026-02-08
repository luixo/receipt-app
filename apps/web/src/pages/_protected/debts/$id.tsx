import { createFileRoute } from "@tanstack/react-router";

import { DebtScreen } from "~app/features/debt/debt-screen";
import { getPathHooks } from "~app/utils/navigation";
import { getTitle } from "~web/utils/i18n";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const Wrapper = () => {
	const { useParams } = getPathHooks("/_protected/debts/$id");
	return <DebtScreen id={useParams().id} />;
};

export const Route = createFileRoute("/_protected/debts/$id")({
	component: Wrapper,
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const debt = await ctx.context.queryClient.fetchQuery(
			trpc.debts.get.queryOptions({ id: ctx.params.id }),
		);
		await ctx.context.queryClient.prefetchQuery(
			trpc.users.get.queryOptions({ id: debt.userId }),
		);
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "debt") }],
	}),
});
