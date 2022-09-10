import React from "react";

import { Primitive } from "zod";

import { QueryParamOptions, useQueryParam } from "./use-query-param";

export const useSyncParsedQueryParam = <
	T extends object | Exclude<Primitive, undefined> = string
>(
	paramName: string,
	options: QueryParamOptions<T>,
	valueToSync: T
) => {
	const [value, setValue] = useQueryParam(paramName, options);
	React.useEffect(() => setValue(valueToSync), [setValue, valueToSync]);
	return value;
};
