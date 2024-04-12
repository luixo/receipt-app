import type * as React from "react";

import type { z } from "zod";

import {
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
	lastColorModeSchema,
	selectedColorModeSchema,
} from "~app/utils/cookie/color-modes";
import { LOCALE_COOKIE_NAME, dateLocaleSchema } from "~app/utils/cookie/locale";
import {
	SETTINGS_COOKIE_NAME,
	settingsSchema,
} from "~app/utils/cookie/settings";
import {
	TZ_OFFSET_COOKIE_NAME,
	timezoneOffsetSchema,
} from "~app/utils/cookie/tz-offset";
import type { Cookies } from "~app/utils/cookies";

export const schemas = {
	// Syncing timezone on SSR and CSR
	[TZ_OFFSET_COOKIE_NAME]: timezoneOffsetSchema,
	// Syncing locale on SSR and CSR
	[LOCALE_COOKIE_NAME]: dateLocaleSchema,
	// Local settings for a user
	[SETTINGS_COOKIE_NAME]: settingsSchema,
	// Last color schema used in this client
	[LAST_COLOR_MODE_COOKIE_NAME]: lastColorModeSchema,
	// Selected color schema used in this client (if any)
	[SELECTED_COLOR_MODE_COOKIE_NAME]: selectedColorModeSchema,
} satisfies Record<string, z.ZodType>;

export type CookieValues = {
	[K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>;
};

export type CookieStates = {
	[K in keyof CookieValues]: [
		CookieValues[K],
		// Update cookie
		React.Dispatch<React.SetStateAction<CookieValues[K]>>,
		// Remove cookie
		() => void,
	];
};

export const getCookieStatesFromValues = (
	mapping: CookieValues,
	getDispatch: <K extends keyof CookieValues>(
		key: K,
	) => React.Dispatch<React.SetStateAction<CookieValues[K]>>,
	getRemove: <K extends keyof CookieValues>(key: K) => () => void,
): CookieStates =>
	Object.fromEntries(
		Object.entries(mapping).map(([key, value]) => [
			key,
			[
				value,
				getDispatch(key as keyof CookieValues),
				getRemove(key as keyof CookieValues),
			],
		]),
	) as unknown as CookieStates;

export const getSSRContextCookieData = (cookies: Cookies = {}): CookieValues =>
	Object.entries(schemas).reduce<CookieValues>((acc, [key, schema]) => {
		let parsedValue = null;
		try {
			parsedValue = JSON.parse(cookies[key]!);
		} catch {
			parsedValue = cookies[key]!;
		}
		return { ...acc, [key]: schema.parse(parsedValue) };
	}, {} as CookieValues);
