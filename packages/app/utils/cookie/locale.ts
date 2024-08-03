import { z } from "zod";

import { fallback } from "~app/utils/validation";

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Intl {
		// see https://github.com/microsoft/TypeScript/issues/29129
		export function getCanonicalLocales(locales: string[]): string[];
	}
}

export const LOCALE_COOKIE_NAME = "ssrContext:locale";

export const getDateTimeLocale = () =>
	Intl.DateTimeFormat().resolvedOptions().locale;

export const dateLocaleSchema = z
	.string()
	.transform((value, ctx) => {
		try {
			const locales = Intl.getCanonicalLocales([value]);
			if (locales.length === 1) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				return locales[0]!;
			}
		} catch (e) {
			if (e instanceof TypeError) {
				return value;
			}
		}
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Not a valid locale",
		});
		return z.NEVER;
	})
	.or(fallback(getDateTimeLocale));
