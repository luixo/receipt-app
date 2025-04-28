import * as React from "react";

import { useLocale } from "~app/hooks/use-locale";
import { useSsrValue } from "~app/hooks/use-ssr-value";
import { TZ_OFFSET_STORE_NAME } from "~app/utils/store/tz-offset";
import { MINUTE } from "~utils/time";

export const useFormat = () => {
	const [tzOffset, localTzOffset] = useSsrValue(TZ_OFFSET_STORE_NAME);
	const getDateWithTz = React.useCallback(
		(date: Date) =>
			new Date(date.valueOf() + (localTzOffset - tzOffset) * MINUTE),
		[tzOffset, localTzOffset],
	);
	const locale = useLocale();
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
