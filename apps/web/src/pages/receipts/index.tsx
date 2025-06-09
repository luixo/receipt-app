import { z } from "zod/v4";

import {
	DEFAULT_LIMIT,
	ReceiptsScreen,
	filtersSchema,
	orderBySchema,
} from "~app/features/receipts/receipts-screen";
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
		"/receipts": z.core.output<typeof schema>;
	}
}

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		sort: orderBySchema,
		filters: filtersSchema,
		limit: limitSchema,
		offset: offsetSchema,
	}),
	{
		sort: "date-desc",
		filters: {},
		limit: DEFAULT_LIMIT,
		offset: 0,
	},
);

const Wrapper = () => {
	const useQueryState = getQueryStates(Route);
	return (
		<ReceiptsScreen
			sortState={useQueryState("sort")}
			filtersState={useQueryState("filters")}
			limitState={useQueryState("limit")}
			offsetState={useQueryState("offset")}
		/>
	);
};

const Route = createFileRoute("/_protected/receipts")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Receipts" }] }),
	validateSearch: schema,
	search: { middlewares: [stripSearchParams(defaults)] },
});

export default Route.Screen;
