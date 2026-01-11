import { createFileRoute } from "@tanstack/react-router";

import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getQueryStates, searchParamsMapping } from "~app/utils/navigation";
import { withDefaultLimit } from "~app/utils/store/limit";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults(
	searchParamsMapping["/debts"],
);

const Wrapper = () => {
	const { id } = Route.useParams();
	const { useQueryState, useDefaultedQueryState } = getQueryStates(
		Route.fullPath,
	);
	return (
		<UserDebtsScreen
			userId={id}
			limitState={useDefaultedQueryState("limit", useDefaultLimit())}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/debts/user/$id/")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("debts");
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			async () => {
				const [userPaged] = await Promise.all([
					ctx.context.queryClient.fetchQuery(
						trpc.debts.getByUserPaged.queryOptions({
							userId: ctx.params.id,
							limit: withDefaultLimit(ctx.deps.limit, ctx.context),
							cursor: ctx.deps.offset,
							filters: {
								showResolved:
									ctx.context.initialValues[SETTINGS_STORE_NAME]
										.showResolvedDebts,
							},
						}),
					),
					ctx.context.queryClient.fetchQuery(
						trpc.debts.getAllUser.queryOptions({ userId: ctx.params.id }),
					),
				]);
				return userPaged;
			},
			({ items }) =>
				items.map((debtId) => trpc.debts.get.queryOptions({ id: debtId })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "userDebts") }],
	}),
});
