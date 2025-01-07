import React from "react";

import {
	type StoreValues,
	getStoreValuesFromInitialValues,
} from "~app/utils/store-data";
import { noop } from "~utils/fn";
import type { MaybePromise } from "~utils/types";

export type StoreContextType = {
	getInitialItems: () => {
		values: MaybePromise<StoreValues>;
		nowTimestamp: number;
	};
	setItem: <T>(key: string, value: T) => MaybePromise<void>;
	deleteItem: (key: string) => MaybePromise<void>;
};

const asyncNoop = async () => noop();

export const StoreContext = React.createContext<StoreContextType>({
	getInitialItems: () => ({
		nowTimestamp: Date.now(),
		values: getStoreValuesFromInitialValues(),
	}),
	setItem: asyncNoop,
	deleteItem: asyncNoop,
});
