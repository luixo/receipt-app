import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import z from "zod/v4";

import { UserDebtsScreen } from "~app/features/user-debts/user-debts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { loadNamespaces } from "~app/utils/i18n";
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
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "debts");
	},
	head: () => ({ meta: [{ title: "RA - User's debts" }] }),
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
});
