import React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import { LOCALE_STORE_NAME, getLocale } from "~app/utils/store/locale";
import {
	TZ_OFFSET_STORE_NAME,
	getTimezoneOffset,
} from "~app/utils/store/tz-offset";
import type { StoreValues } from "~app/utils/store-data";

const useSetLocalSetting = <T extends keyof StoreValues>(
	key: T,
	getValue: () => StoreValues[T],
) => {
	const [, setValue] = React.use(StoreDataContext)[key];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	useMountEffect(() => setValue(getValue() as any));
};

// Store values that are set to make next render mimic user environment in case of SSR
// (with user tz offset and locale)
export const useStoreLocalSettings = () => {
	useSetLocalSetting(LOCALE_STORE_NAME, getLocale);
	useSetLocalSetting(TZ_OFFSET_STORE_NAME, getTimezoneOffset);
};
