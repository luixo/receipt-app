import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { UsersScreen } from "~app/features/users/users-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
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
	head: () => ({ meta: [{ title: "RA - Users" }] }),
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
});
