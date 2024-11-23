import * as React from "react";

import { StoreDataContext } from "~app/contexts/store-data-context";
import { LOCALE_STORE_NAME, getDateTimeLocale } from "~app/utils/store/locale";
import {
	TZ_OFFSET_STORE_NAME,
	getTimezoneOffset,
} from "~app/utils/store/tz-offset";
import { MINUTE } from "~utils/time";

export const useSsrFormat = () => {
	const {
		[TZ_OFFSET_STORE_NAME]: ssrTzOffsetState,
		[LOCALE_STORE_NAME]: ssrLocaleState,
		isFirstRender,
	} = React.useContext(StoreDataContext);
	const [ssrTzOffset] = ssrTzOffsetState;
	const [ssrLocale] = ssrLocaleState;
	const getDateWithTz = React.useCallback(
		(date: Date) => {
			if (!isFirstRender) {
				return date;
			}
			const localTzOffset = getTimezoneOffset();
			// Client don't have cookie yet or we're in the same tz
			if (ssrTzOffset === localTzOffset) {
				return date;
			}
			return new Date(date.valueOf() + (localTzOffset - ssrTzOffset) * MINUTE);
		},
		[isFirstRender, ssrTzOffset],
	);
	const locale = React.useMemo(() => {
		if (!isFirstRender) {
			return;
		}
		const localLocale = getDateTimeLocale();
		// Client don't have cookie yet or we're in the same locale
		if (ssrLocale === localLocale) {
			return;
		}
		return ssrLocale;
	}, [isFirstRender, ssrLocale]);
	const formatDate = React.useCallback(
		(date: Date, options?: Intl.DateTimeFormatOptions) =>
			getDateWithTz(date).toLocaleDateString(locale, options),
		[getDateWithTz, locale],
	);
	const formatTime = React.useCallback(
		(date: Date, options?: Intl.DateTimeFormatOptions) =>
			getDateWithTz(date).toLocaleTimeString(locale, options),
		[getDateWithTz, locale],
	);
	const formatDateTime = React.useCallback(
		(date: Date, options?: Intl.DateTimeFormatOptions) =>
			getDateWithTz(date).toLocaleString(locale, options),
		[getDateWithTz, locale],
	);
	return { formatDate, formatTime, formatDateTime };
};
