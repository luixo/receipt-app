import type * as React from "react";

import { entries, fromEntries, mapValues } from "remeda";
import type { z } from "zod/v4";

import {
	LAST_COLOR_MODE_STORE_NAME,
	SELECTED_COLOR_MODE_STORE_NAME,
	lastColorModeSchema,
	selectedColorModeSchema,
} from "~app/utils/store/color-modes";
import {
	LOCALE_STORE_NAME,
	getLocale,
	localeSchema,
} from "~app/utils/store/locale";
import {
	PRETEND_USER_STORE_NAME,
	pretendUserSchema,
} from "~app/utils/store/pretend-user";
import { SETTINGS_STORE_NAME, settingsSchema } from "~app/utils/store/settings";
import {
	TIMEZONE_STORE_NAME,
	getTimezone,
	timezoneSchema,
} from "~app/utils/store/timezone";

export type SerializedValues = Partial<Record<string, string>>;

export const schemas = {
	// Syncing timezone on SSR and CSR
	[TIMEZONE_STORE_NAME]: timezoneSchema,
	// Syncing locale on SSR and CSR
	[LOCALE_STORE_NAME]: localeSchema,
	// Local settings for a user
	[SETTINGS_STORE_NAME]: settingsSchema,
	// Last color schema used in this client
	[LAST_COLOR_MODE_STORE_NAME]: lastColorModeSchema,
	// Selected color schema used in this client (if any)
	[SELECTED_COLOR_MODE_STORE_NAME]: selectedColorModeSchema,
	// Pretend user
	[PRETEND_USER_STORE_NAME]: pretendUserSchema,
} satisfies Record<string, z.ZodType>;

export type StoreValues = {
	[K in keyof typeof schemas]: z.infer<(typeof schemas)[K]>;
};

export const defaultGetters: Partial<{
	[K in keyof StoreValues]: () => StoreValues[K];
}> = {
	[TIMEZONE_STORE_NAME]: getTimezone,
	[LOCALE_STORE_NAME]: getLocale,
};

export type StoreStates = {
	[K in keyof StoreValues]: [
		StoreValues[K],
		// Update store value
		React.Dispatch<React.SetStateAction<StoreValues[K]>>,
		// Remove store value
		() => void,
	];
};

export const getStoreStatesFromValues = (
	mapping: StoreValues,
	getDispatch: <K extends keyof StoreValues>(
		key: K,
	) => React.Dispatch<React.SetStateAction<StoreValues[K]>>,
	getRemove: <K extends keyof StoreValues>(key: K) => () => void,
): StoreStates =>
	mapValues(mapping, (value, key) => [
		value,
		getDispatch(key),
		getRemove(key),
	]) as StoreStates;

export const getStoreValuesFromInitialValues = (
	initialValues: SerializedValues = {},
): StoreValues =>
	fromEntries(
		entries(schemas).map(([key, schema]) => {
			let parsedValue: unknown = null;
			try {
				parsedValue = JSON.parse(initialValues[key] || "");
			} catch {
				parsedValue = initialValues[key];
			}
			return [key, schema.parse(parsedValue)];
		}),
	) as StoreValues;
