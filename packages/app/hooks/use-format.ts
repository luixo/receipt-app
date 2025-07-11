import * as React from "react";

import { useBooleanState } from "~app/hooks/use-boolean-state";
import { useLocale } from "~app/hooks/use-locale";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import { useSsrValue } from "~app/hooks/use-ssr-value";
import { TIMEZONE_STORE_NAME } from "~app/utils/store/timezone";
import type { TemporalType } from "~utils/date";
import { formatters } from "~utils/date";

export const useFormat = () => {
	const [timezone, localTimezone] = useSsrValue(TIMEZONE_STORE_NAME);
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
	const effectiveTimezone = isMounted ? localTimezone : timezone;
	const locale = useLocale();
	return React.useMemo<{
		[K in TemporalType as `format${Capitalize<K>}`]: (
			date: Parameters<(typeof formatters)[K]>[0],
			options?: Parameters<(typeof formatters)[K]>[2],
		) => string;
	}>(
		() => ({
			formatPlainDate: (date, options) =>
				formatters.plainDate(date, locale, {
					timeZone: effectiveTimezone,
					...options,
				}),
			formatPlainTime: (date, options) =>
				formatters.plainTime(date, locale, {
					timeZone: effectiveTimezone,
					...options,
				}),
			formatPlainDateTime: (date, options) =>
				formatters.plainDateTime(date, locale, {
					timeZone: effectiveTimezone,
					...options,
				}),
			formatZonedTime: (date, options) =>
				formatters.zonedTime(date, locale, {
					timeZone: effectiveTimezone,
					...options,
				}),
			formatZonedDateTime: (date, options) =>
				formatters.zonedDateTime(date, locale, {
					timeZone: effectiveTimezone,
					...options,
				}),
		}),
		[effectiveTimezone, locale],
	);
};
