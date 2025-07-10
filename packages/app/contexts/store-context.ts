import React from "react";

import { doNothing } from "remeda";

import {
	type StoreValues,
	getStoreValuesFromInitialValues,
} from "~app/utils/store-data";
import type { MaybePromise } from "~utils/types";

export type StoreContextType = {
	getInitialItems: () => {
		values: MaybePromise<StoreValues>;
		nowTimestamp: number;
	};
	setItem: <T>(key: string, value: T) => MaybePromise<void>;
	deleteItem: (key: string) => MaybePromise<void>;
};

export const StoreContext = React.createContext<StoreContextType>({
	getInitialItems: () => ({
		nowTimestamp: Date.now(),
		values: getStoreValuesFromInitialValues(),
	}),
	setItem: doNothing(),
	deleteItem: doNothing(),
});
