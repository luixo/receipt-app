import currencyList from "currency-list";
import { keys } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";

const DEFAULT_LOCALE = "en";

type CurrencyDescription = ReturnType<typeof currencyList.get>;
export const CURRENCY_CODES = keys(currencyList.getAll("en"));
export const getCurrencies = (locale = DEFAULT_LOCALE) =>
	currencyList.getAll(locale) as
		| Record<CurrencyCode, CurrencyDescription>
		| undefined;
export const getCurrency = (
	currencyCode: CurrencyCode,
	locale = DEFAULT_LOCALE,
) => {
	const currencies = getCurrencies(locale);
	if (!currencies) {
		throw new Error(`Locale ${locale} does not exist in currencies`);
	}
	const currency = currencies[currencyCode];
	if (!currency) {
		throw new Error(`Currency ${currencyCode} does not exist in currencies`);
	}
	return currency;
};
export const getCurrencySymbol = (
	currencyCode: CurrencyCode,
	locale = DEFAULT_LOCALE,
) => getCurrency(currencyCode, locale).symbol_native;
export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
