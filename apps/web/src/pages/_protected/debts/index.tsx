import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod";

import { DebtsScreen } from "~app/features/debts/debts-screen";
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
	const useQueryState = getQueryStates(Route);
	return (
		<DebtsScreen
			limitState={useQueryState("limit")}
			offsetState={useQueryState("offset")}
		/>
	);
};

export const Route = createFileRoute("/_protected/debts/")({
	component: Wrapper,
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	loaderDeps: ({ search: { offset, limit } }) => ({
		offset,
		limit,
	}),
	loader: async (ctx) => {
		const trpc = getLoaderTrpcClient(ctx.context);
		const prefetched = prefetch(
			ctx,
			trpc.debts.getUsersPaged.queryOptions({
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
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "debts") }],
	}),
});
