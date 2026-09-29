import type { Locale } from "#app/utils/locale.ts";
import {
	fallback,
	localeSchema as rawLocaleSchema,
} from "#app/utils/validation.ts";

export const LOCALE_STORE_NAME = "ssrContext:locale";

export const getLocale = (): Locale =>
	new Intl.DateTimeFormat().resolvedOptions().locale;

export const localeSchema = rawLocaleSchema.or(fallback(getLocale));
