import {
	parseAsInteger,
	parseAsJson,
	parseAsStringLiteral,
	useQueryState,
} from "nuqs";

import {
	DEFAULT_LIMIT,
	ReceiptsScreen,
	filtersSchema,
	orderBySchema,
} from "~app/features/receipts/receipts-screen";
import type { AppPage } from "~utils/next";

const Screen: AppPage = () => {
	const sortState = useQueryState(
		"sort",
		parseAsStringLiteral(orderBySchema.options).withDefault("date-desc"),
	);
	const filtersState = useQueryState(
		"filters",
		parseAsJson(filtersSchema.parse).withDefault({}),
	);
	const limitState = useQueryState(
		"limit",
		parseAsInteger.withDefault(DEFAULT_LIMIT),
	);
	const offsetState = useQueryState("offset", parseAsInteger.withDefault(0));
	return (
		<ReceiptsScreen
			sortState={sortState}
			filtersState={filtersState}
			limitState={limitState}
			offsetState={offsetState}
		/>
	);
};

export default Screen;
