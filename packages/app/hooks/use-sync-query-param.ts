import React from "react";

import { Primitive } from "zod";

import { QueryParamOptions, useQueryParam } from "./use-query-param";

export type SyncQueryParamOptions<
	T extends object | Exclude<Primitive, undefined>
> = Required<Omit<QueryParamOptions<T>, "defaultValue">> &
	Pick<QueryParamOptions<T>, "defaultValue"> & {
		param: string;
	};

export const useSyncQueryParam = <
	T extends object | Exclude<Primitive, undefined> = string
>(
	options: SyncQueryParamOptions<T>,
	valueToSync: T
) => {
	const { param, ...rest } = options;
	const [value, setValue] = useQueryParam(param, rest);
	React.useEffect(() => setValue(valueToSync), [setValue, valueToSync]);
	return value;
};
