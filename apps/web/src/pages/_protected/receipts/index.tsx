import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod/v4";

import {
	DEFAULT_LIMIT,
	ReceiptsScreen,
	filtersSchema,
	orderBySchema,
} from "~app/features/receipts/receipts-screen";
import { getQueryStates } from "~app/hooks/use-navigation";
import { limitSchema, offsetSchema } from "~web/handlers/validation";
import { searchParamsWithDefaults } from "~web/utils/navigation";

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

export const Route = createFileRoute("/_protected/receipts/")({
	component: Wrapper,
	head: () => ({ meta: [{ title: "RA - Receipts" }] }),
	validateSearch: zodValidator(schema),
	search: { middlewares: [stripSearchParams(defaults)] },
});
