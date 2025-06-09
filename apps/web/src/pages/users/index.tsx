import { z } from "zod/v4";

import { DEFAULT_LIMIT, UsersScreen } from "~app/features/users/users-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { limitSchema, offsetSchema } from "~web/handlers/validation";
import {
	searchParamsWithDefaults,
	stripSearchParams,
} from "~web/utils/navigation";
import { createFileRoute } from "~web/utils/router";

declare module "@react-types/shared" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface RegisteredParams {
		"/users": z.core.output<typeof schema>;
	}
}

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

const Route = createFileRoute("/_protected/users")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Users" }] }),
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
});

export default Route.Screen;
