import * as React from "react";

import { doNothing } from "remeda";

import {
	type CookieStates,
	type CookieValues,
	getCookieStatesFromValues,
	getSSRContextCookieData,
} from "~app/utils/cookie-data";

// The data above + data we add on each render
export type SSRContextData = {
	values?: CookieValues;
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
		() => doNothing,
		() => doNothing,
	),
	nowTimestamp: Date.now(),
	isFirstRender: true,
});
