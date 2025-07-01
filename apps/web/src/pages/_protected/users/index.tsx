import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { UsersScreen } from "~app/features/users/users-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { getTitle, loadNamespaces } from "~app/utils/i18n";
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
	loader: async (ctx) => {
		await loadNamespaces(ctx.context, "users");
	},
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
	head: ({ match }) => ({
		meta: [{ title: getTitle(match.context, "users") }],
	}),
});
