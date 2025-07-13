import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { UsersScreen } from "~app/features/users/users-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import {
	DEFAULT_LIMIT,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetchQueries } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		limit: limitSchema,
		offset: offsetSchema,
	}),
	{ limit: DEFAULT_LIMIT, offset: 0 },
);
const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return (
		<UsersScreen
			limitState={useQueryState("limit")}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/users/")({
	component: Wrapper,
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = prefetchQueries(
			ctx,
			trpc.users.getPaged.queryOptions({
				limit: ctx.deps.limit,
				cursor: ctx.deps.offset,
			}),
		);
		await loadNamespaces(ctx.context, "users");
		return { prefetched };
	},
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "users") }],
	}),
});
