import React from "react";

import { useQueryState } from "next-usequerystate";
import { useRouter, useSearchParams } from "solito/navigation";
import type { Primitive } from "zod";

import { id } from "~app/utils/utils";

export type QueryParamOptions<T extends object | Primitive = string> = {
	parse?: (input: string | undefined) => T;
	serialize?: (input: T) => string | null;
	defaultValue?: T;
};

export const useQueryParam = <T extends object | Primitive = string>(
	paramName: string,
	options: QueryParamOptions<T>,
) => {
	const searchParams = useSearchParams<{ [K in string]: string }>();
	const serverSideQueryOffset = searchParams?.get(paramName) ?? undefined;
	const parse = (options.parse || id) as NonNullable<typeof options.parse>;
	const serialize = (options.serialize || id) as NonNullable<
		typeof options.serialize
	>;
	const [rawValue, setRawValue] = useQueryState(paramName, {
		useRouter,
		useSearchParams,
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
		[rawValue],
	);
	const setValue = React.useCallback(
		(valueOrUpdater: React.SetStateAction<T>) => {
			if (typeof valueOrUpdater === "function") {
				// We can't use update function of `setRawValue`
				// as `rawValue` is not updated when it's been set to null
				void setRawValue(serialize(valueOrUpdater(parsedValue)));
			} else {
				void setRawValue(serialize(valueOrUpdater));
			}
		},
		// We don't need to update serialize / parse on every rerender
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[setRawValue, parsedValue],
	);
	return [parsedValue, setValue] as const;
};
