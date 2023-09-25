import * as React from "react";

import { SSRContext } from "app/contexts/ssr-context";
import { MINUTE } from "app/utils/time";

export const useSsrFormat = () => {
	const {
		tzOffset: ssrTzOffset,
		locale: ssrLocale,
		isFirstRender,
	} = React.useContext(SSRContext);
	const getDateWithTz = React.useCallback(
		(date: Date) =>
			isFirstRender
				? new Date(
						date.valueOf() +
							(new Date().getTimezoneOffset() - ssrTzOffset) * MINUTE,
				  )
				: date,
		[isFirstRender, ssrTzOffset],
	);
	const locale = React.useMemo(
		() => (isFirstRender ? ssrLocale : undefined),
		[isFirstRender, ssrLocale],
	);
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
