import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod/v4";

import { DebtsScreen } from "~app/features/debts/debts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getServerSideT, loadNamespaces } from "~app/utils/i18n";
import {
	DEFAULT_LIMIT,
	limitSchema,
	offsetSchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

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
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	head: ({ match }) => {
		const t = getServerSideT(match.context);
		const title = t("titles.template", { page: t("titles.debts") });
		return { meta: [{ title }] };
	},
});
