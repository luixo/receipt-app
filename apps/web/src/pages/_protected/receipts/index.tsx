import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import { ReceiptsScreen } from "~app/features/receipts/receipts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import {
	DEFAULT_LIMIT,
	limitSchema,
	offsetSchema,
	receiptsFiltersSchema,
	receiptsOrderBySchema,
} from "~app/utils/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

const [schema, defaults] = searchParamsWithDefaults(
	z.object({
		sort: receiptsOrderBySchema,
		filters: receiptsFiltersSchema,
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

export const Route = createFileRoute("/_protected/receipts/")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Receipts" }] }),
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
});
