import React from "react";

import type { Primitive } from "zod";

import type { QueryParamOptions } from "~app/hooks/use-query-param";
import { useQueryParam } from "~app/hooks/use-query-param";

export type SyncQueryParamOptions<T extends object | Primitive> = Required<
	Omit<QueryParamOptions<T>, "defaultValue">
> &
	Pick<QueryParamOptions<T>, "defaultValue"> & {
		param: string;
	};

export const useSyncQueryParam = <T extends object | Primitive = string>(
	options: SyncQueryParamOptions<T>,
	valueToSync: T,
) => {
	const { param, ...rest } = options;
	const [value, setValue] = useQueryParam(param, rest);
	React.useEffect(() => setValue(valueToSync), [setValue, valueToSync]);
	return value;
};
