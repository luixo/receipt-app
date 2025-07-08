import * as React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import type { StoreStates, StoreValues } from "~app/utils/store-data";
import { defaultGetters } from "~app/utils/store-data";

export const useSsrValue = <K extends keyof StoreValues>(
	key: K,
): [StoreValues[K], StoreValues[K]] => {
	const storeDataContext = React.use(StoreDataContext);
	const [ssrValue] = storeDataContext[key] as StoreStates[K];
	const getter = defaultGetters[key];
	if (!getter) {
		throw new Error(`Cannot get SSR value for key "${key}"`);
	}
	const localValue = React.useMemo(() => getter(), [getter]);
	if (storeDataContext.isFirstRender) {
		return [ssrValue, localValue];
	}
	return [localValue, localValue];
};
