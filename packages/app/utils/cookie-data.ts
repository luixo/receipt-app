import type * as React from "react";

import { entries, mapValues } from "remeda";
import type { z } from "zod";

import {
	LAST_COLOR_MODE_COOKIE_NAME,
	SELECTED_COLOR_MODE_COOKIE_NAME,
	lastColorModeSchema,
	selectedColorModeSchema,
} from "~app/utils/cookie/color-modes";
import { LOCALE_COOKIE_NAME, dateLocaleSchema } from "~app/utils/cookie/locale";
import {
	PRETEND_USER_COOKIE_NAME,
	pretendUserSchema,
} from "~app/utils/cookie/pretend-user";
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
	// Pretend user
	[PRETEND_USER_COOKIE_NAME]: pretendUserSchema,
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
	mapValues(mapping, (value, key) => [
		value,
		getDispatch(key),
		getRemove(key),
	]) as CookieStates;

export const getSSRContextCookieData = (cookies: Cookies = {}): CookieValues =>
	entries(schemas).reduce<CookieValues>((acc, [key, schema]) => {
		let parsedValue: unknown = null;
		try {
			parsedValue = JSON.parse(cookies[key] || "");
		} catch {
			parsedValue = cookies[key];
		}
		return { ...acc, [key]: schema.parse(parsedValue) };
	}, {} as CookieValues);
