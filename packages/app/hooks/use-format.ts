import * as React from "react";

import { useBooleanState } from "#app/hooks/use-boolean-state.ts";
import { useLocale } from "#app/hooks/use-locale.ts";
import { useMountEffect } from "#app/hooks/use-mount-effect.ts";
import { useSsrValue } from "#app/hooks/use-ssr-value.ts";
import { TIMEZONE_STORE_NAME } from "#app/utils/store/timezone.ts";
import type { TemporalMapping } from "#utils/temporal.ts";

export const useFormat = () => {
	const [timezone, localTimezone] = useSsrValue(TIMEZONE_STORE_NAME);
	const [isMounted, { setTrue: setMounted }] = useBooleanState();
	useMountEffect(setMounted);
	const effectiveTimezone = isMounted ? localTimezone : timezone;
	const locale = useLocale();
	return React.useMemo<{
		[K in keyof TemporalMapping as `format${Capitalize<K>}`]: (
			date: TemporalMapping[K],
			options?: Intl.DateTimeFormatOptions,
		) => string;
	}>(
		() => ({
			formatPlainDate: (date, options) =>
				date.toLocaleString(locale, { dateStyle: "medium", ...options }),
			formatPlainTime: (date, options) =>
				date.toLocaleString(locale, { timeStyle: "short", ...options }),
			formatPlainDateTime: (date, options) =>
				date.toLocaleString(locale, {
					dateStyle: "medium",
					timeStyle: "short",
					...options,
				}),
			// `ZonedDateTime` carries its own time zone, so convert instead
			formatZonedDateTime: (date, { timeZone, ...rest } = {}) =>
				date
					.withTimeZone(timeZone ?? effectiveTimezone)
					.toLocaleString(locale, {
						dateStyle: "medium",
						timeStyle: "short",
						...rest,
					}),
		}),
		[effectiveTimezone, locale],
	);
};
