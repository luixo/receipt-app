import type { UseQueryStatesKeysMap, Values } from "nuqs";
import {
	createLoader,
	parseAsBoolean,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	parseAsStringLiteral,
} from "nuqs";

export type SearchParams = Partial<Record<string, string | string[]>>;

export type SearchParamsValues<T extends UseQueryStatesKeysMap> = Values<T>;

export {
	parseAsString,
	parseAsInteger,
	parseAsJson,
	parseAsStringLiteral,
	parseAsBoolean,
	createLoader,
};
