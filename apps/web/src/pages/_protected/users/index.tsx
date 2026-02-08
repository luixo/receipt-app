import { createFileRoute } from "@tanstack/react-router";

import { UsersScreen } from "~app/features/users/users-screen";
import { searchParamsMapping } from "~app/utils/navigation";
import { withDefaultLimit } from "~app/utils/store/limit";
import { getTitle } from "~web/utils/i18n";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults(
	searchParamsMapping["/users"],
);

export const Route = createFileRoute("/_protected/users/")({
	component: UsersScreen,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await ctx.context.i18nContext.loadNamespaces("users");
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = await prefetchQueriesWith(
			ctx,
			() =>
				ctx.context.queryClient.fetchQuery(
					trpc.users.getPaged.queryOptions({
						limit: withDefaultLimit(ctx.deps.limit, ctx.context),
						cursor: ctx.deps.offset,
					}),
				),
			(list) => list.items.map((id) => trpc.users.get.queryOptions({ id })),
		);
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context.i18nContext, "users") }],
	}),
});
