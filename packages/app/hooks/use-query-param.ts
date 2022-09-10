import React from "react";

import { useQueryState } from "next-usequerystate";
import { createParam } from "solito";
import { Primitive } from "zod";

import { id } from "app/utils/utils";

const { useParam } = createParam<{ [K in string]: string }>();

export const useQueryParam = <
	T extends object | Exclude<Primitive, undefined> = string
>(
	paramName: string,
	options: {
		parse?: (input: string) => T;
		serialize?: (input: T) => string | null;
		defaultValue?: T;
	}
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
		() => parse(rawValue || ""),
		// We don't need to update parse on every rerender
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[rawValue]
	);
	const setValue = React.useCallback(
		(valueOrUpdater: React.SetStateAction<T>) => {
			if (typeof valueOrUpdater === "function") {
				setRawValue((prev) => serialize(valueOrUpdater(parse(prev || ""))));
			} else {
				setRawValue(serialize(valueOrUpdater));
			}
		},
		// We don't need to update serialize / parse on every rerender
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[setRawValue]
	);
	return [parsedValue, setValue] as const;
};
