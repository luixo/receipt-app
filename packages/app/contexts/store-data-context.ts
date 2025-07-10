import * as React from "react";

import { doNothing } from "remeda";

import {
	type StoreStates,
	type StoreValues,
	getStoreStatesFromValues,
	getStoreValuesFromInitialValues,
} from "~app/utils/store-data";
import { getNow } from "~utils/date";

// The data above + data we add on each render
export type StoreData = {
	values?: StoreValues;
	// Without this timestamp relative dates might differ on server and client
	// (e.g. "1 second ago" and "2 seconds ago")
	// which will cause hydration mismatch warning
	nowTimestamp: number;
};

// The data above + flag of whether it's first render
export type StoreDataContextType = Omit<StoreData, keyof StoreValues> & {
	isFirstRender: boolean;
} & StoreStates;

export const StoreDataContext = React.createContext<StoreDataContextType>({
	...getStoreStatesFromValues(
		getStoreValuesFromInitialValues(),
		() => doNothing,
		() => doNothing,
	),
	nowTimestamp: getNow().valueOf(),
	isFirstRender: true,
});
