import React from "react";

import { SSRContext } from "~app/contexts/ssr-context";
import { useMountEffect } from "~app/hooks/use-mount-effect";
import {
	LOCALE_COOKIE_NAME,
	getDateTimeLocale,
} from "~app/utils/cookie/locale";
import {
	TZ_OFFSET_COOKIE_NAME,
	getTimezoneOffset,
} from "~app/utils/cookie/tz-offset";
import type { CookieValues } from "~app/utils/cookie-data";

const useSetLocalCookie = <T extends keyof CookieValues>(
	key: T,
	getValue: () => CookieValues[T],
) => {
	const [, setValue] = React.useContext(SSRContext)[key];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	useMountEffect(() => setValue(getValue() as any));
};

// Cookies that are set to make next render mimic user environment
// (with user tz offset and locale)
export const useLocalCookies = () => {
	useSetLocalCookie(LOCALE_COOKIE_NAME, getDateTimeLocale);
	useSetLocalCookie(TZ_OFFSET_COOKIE_NAME, getTimezoneOffset);
};
