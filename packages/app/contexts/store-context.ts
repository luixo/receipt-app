import React from "react";

import { doNothing } from "remeda";

import {
	type StoreValues,
	getStoreValuesFromInitialValues,
} from "~app/utils/store-data";
import type { Temporal } from "~utils/date";
import { getNow } from "~utils/date";

export type StoreContextType = {
	getInitialItems: () => StoreValues & {
		nowTimestamp: Temporal.ZonedDateTime;
	};
	setItem: <T>(key: string, value: T) => void;
	deleteItem: (key: string) => void;
};

export const StoreContext = React.createContext<StoreContextType>({
	getInitialItems: () => ({
		...getStoreValuesFromInitialValues(),
		nowTimestamp: getNow.zonedDateTime(),
	}),
	setItem: doNothing(),
	deleteItem: doNothing(),
});
