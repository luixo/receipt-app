import * as React from "react";

import {
	type CookieStates,
	type CookieValues,
	getCookieStatesFromValues,
	getSSRContextCookieData,
} from "app/utils/cookie-data";
import { noop } from "app/utils/utils";

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

export const SSRContext = React.createContext<SSRContextType>({
	...getCookieStatesFromValues(
		getSSRContextCookieData(),
		() => noop,
		() => noop,
	),
	nowTimestamp: Date.now(),
	isFirstRender: true,
});
