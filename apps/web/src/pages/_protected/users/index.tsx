import { createFileRoute } from "@tanstack/react-router";

import { UsersScreen } from "~app/features/users/users-screen";
import { useDefaultLimit } from "~app/hooks/use-default-limit";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { withDefaultLimit } from "~app/utils/store/limit";
import { limitSchema, offsetSchema } from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueriesWith } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [validateSearch, stripDefaults] = searchParamsWithDefaults({
	limit: limitSchema.optional().catch(undefined),
	offset: offsetSchema.catch(0),
});

const Wrapper = () => {
	const { useQueryState, useDefaultedQueryState } = getQueryStates(Route);
	return (
		<UsersScreen
			limitState={useDefaultedQueryState("limit", useDefaultLimit())}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/users/")({
	component: Wrapper,
	validateSearch,
	search: { middlewares: [stripDefaults] },
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
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
		meta: [{ title: getTitle(match.context, "users") }],
	}),
});
