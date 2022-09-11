import React from "react";

import { useQueryState } from "next-usequerystate";
import { createParam } from "solito";
import { Primitive } from "zod";

import { id } from "app/utils/utils";

const { useParam } = createParam<{ [K in string]: string }>();

export type QueryParamOptions<
	T extends object | Exclude<Primitive, undefined> = string
> = {
	parse?: (input: string | undefined) => T;
	serialize?: (input: T) => string | null;
	defaultValue?: T;
};

export const useQueryParam = <
	T extends object | Exclude<Primitive, undefined> = string
>(
	paramName: string,
	options: QueryParamOptions<T>
) => {
	const [serverSideQueryOffset] = useParam(paramName);
	const parse = (options.parse || id) as NonNullable<typeof options.parse>;
	const serialize = (options.serialize || id) as NonNullable<
		typeof options.serialize
	>;
	const [rawValue, setRawValue] = useQueryState(paramName, {
		defaultValue:
			serverSideQueryOffset ||
			(options.defaultValue === undefined
				? ""
				: serialize(options.defaultValue) || ""),
	});

	const parsedValue = React.useMemo(
		() => parse(rawValue),
		// We don't need to update parse on every rerender
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[rawValue]
	);
	const setValue = React.useCallback(
		(valueOrUpdater: React.SetStateAction<T>) => {
			if (typeof valueOrUpdater === "function") {
				// We can't use update function of `setRawValue`
				// as `rawValue` is not updated when it's been set to null
				setRawValue(serialize(valueOrUpdater(parsedValue)));
			} else {
				setRawValue(serialize(valueOrUpdater));
			}
		},
		// We don't need to update serialize / parse on every rerender
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[setRawValue, parsedValue]
	);
	return [parsedValue, setValue] as const;
};
