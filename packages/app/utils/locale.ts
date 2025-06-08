export type Locale = string & {
	__flavor?: "locale";
};

export const DEFAULT_LOCALE: Locale = "en-US";

export const VALID_LOCALES = Intl.getCanonicalLocales();

// TODO: this is needed to be refined
// Real-life locale contains multiple sections (date & time, number formatting etc.)
export const getValidLocale = (input: string): Locale | undefined => {
	try {
		const locales = Intl.getCanonicalLocales([input]);
		if (locales.length === 1) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return locales[0]! as Locale;
		}
	} catch (e) {
		if (e instanceof TypeError) {
			return input as Locale;
		}
	}
};
