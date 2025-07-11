import React from "react";

import { doNothing } from "remeda";

import {
	type StoreValues,
	getStoreValuesFromInitialValues,
} from "~app/utils/store-data";
import type { Temporal } from "~utils/date";
import { getNow } from "~utils/date";
import type { MaybePromise } from "~utils/types";

export type StoreContextType = {
	getInitialItems: () => {
		values: MaybePromise<StoreValues>;
		nowTimestamp: Temporal.ZonedDateTime;
	};
	setItem: <T>(key: string, value: T) => MaybePromise<void>;
	deleteItem: (key: string) => MaybePromise<void>;
};

export const StoreContext = React.createContext<StoreContextType>({
	getInitialItems: () => ({
		nowTimestamp: getNow.zonedDateTime(),
		values: getStoreValuesFromInitialValues(),
	}),
	setItem: doNothing(),
	deleteItem: doNothing(),
});
