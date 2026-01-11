import { createFileRoute } from "@tanstack/react-router";

import { DebtsExchangeAllScreen } from "~app/features/debts-exchange-all/debts-exchange-all-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { currencyCodeSchema } from "~app/utils/validation";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	from: currencyCodeSchema.optional().catch(undefined),
});

const Wrapper = () => {
	const { id } = Route.useParams();
	const { useQueryState } = getQueryStates(Route);
	return (
		<DebtsExchangeAllScreen userId={id} fromState={useQueryState("from")} />
	);
};

export const Route = createFileRoute("/_protected/debts/user/$id/exchange/all")(
	{
		component: Wrapper,
		validateSearch,
		search: { middlewares: [stripDefaults] },
		loaderDeps: ({ search: { from } }) => ({ from }),
		loader: async (ctx) => {
			await ctx.context.i18nContext.loadNamespaces("debts");
			if (!import.meta.env.SSR) {
				return;
			}
			const trpc = getLoaderTrpcClient(ctx.context);
			const debts = await ctx.context.queryClient.fetchQuery(
				trpc.debts.getAllUser.queryOptions({ userId: ctx.params.id }),
			);
			if (ctx.deps.from) {
				const nonResolvedDebts = debts.filter((element) => element.sum !== 0);
				await ctx.context.queryClient.fetchQuery(
					trpc.currency.rates.queryOptions({
						from: ctx.deps.from,
						to: nonResolvedDebts
							.map((debt) => debt.currencyCode)
							.filter((code) => code !== ctx.deps.from),
					}),
				);
			}
		},
		head: ({ match }) => ({
			meta: [
				{ title: getTitle(match.context.i18nContext, "exchangeAllDebts") },
			],
		}),
	},
);
