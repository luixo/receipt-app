import type { Locale } from "~app/utils/locale";
import {
	fallback,
	localeSchema as rawLocaleSchema,
} from "~app/utils/validation";

export const LOCALE_STORE_NAME = "ssrContext:locale";

export const getLocale = (): Locale =>
	Intl.DateTimeFormat().resolvedOptions().locale;

export const localeSchema = rawLocaleSchema.or(fallback(getLocale));
