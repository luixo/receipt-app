import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod/v4";

import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
import { SETTINGS_STORE_NAME } from "~app/utils/store/settings";
import {
	DEFAULT_LIMIT,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";
import { prefetch } from "~web/utils/ssr";
import { getLoaderTrpcClient } from "~web/utils/trpc";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		limit: limitSchema,
		offset: offsetSchema,
	}),
	{
		limit: DEFAULT_LIMIT,
		offset: 0,
	},
);

const Wrapper = () => {
	const { id } = Route.useParams();
	const useQueryState = getQueryStates(Route);
	return (
		<UserDebtsScreen
			userId={id}
			limitState={useQueryState("limit")}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/debts/user/$id/")({
	component: Wrapper,
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = prefetch(
			ctx,
			trpc.debts.getByUserPaged.queryOptions({
				userId: ctx.params.id,
				limit: ctx.deps.limit,
				cursor: ctx.deps.offset,
				filters: {
					showResolved:
						ctx.context.initialValues[SETTINGS_STORE_NAME].showResolvedDebts,
				},
			}),
		);
		await loadNamespaces(ctx.context, "debts");
		return { prefetched };
	},
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "userDebts") }],
	}),
});
