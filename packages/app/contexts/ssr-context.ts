import * as React from "react";

import {
	type CookieStates,
	type CookieValues,
	getCookieStatesFromValues,
	schemas,
} from "app/utils/cookie-data";
import { noop } from "app/utils/utils";
import type { getCookies } from "next-app/utils/client-cookies";

// The data above + data we add on each render
export type SSRContextData = CookieValues & {
	// Without this timestamp relative dates might differ on server and client
	// (e.g. "1 second ago" and "2 seconds ago")
	// which will cause hydration mismatch warning
	nowTimestamp: number;
};

// The data above + flag of whether it's first render
export type SSRContextType = Omit<SSRContextData, keyof CookieValues> & {
	isFirstRender: boolean;
} & CookieStates;

export const getSSRContextCookieData = (
	cookies: ReturnType<typeof getCookies> = {},
): CookieValues =>
	Object.entries(schemas).reduce<CookieValues>((acc, [key, schema]) => {
		let parsedValue = null;
		try {
			parsedValue = JSON.parse(cookies[key]!);
		} catch {
			parsedValue = cookies[key]!;
		}
		return { ...acc, [key]: schema.parse(parsedValue) };
	}, {} as CookieValues);

export const SSRContext = React.createContext<SSRContextType>({
	...getCookieStatesFromValues(
		getSSRContextCookieData(),
		() => noop,
		() => noop,
	),
	nowTimestamp: Date.now(),
	isFirstRender: true,
});
