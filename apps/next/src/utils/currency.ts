import currencyList from "currency-list";

import { CurrencyCode } from "app/utils/currency";

type CurrencyDescription = ReturnType<typeof currencyList.get>;
const CURRENCY_CODES = Object.keys(currencyList.getAll("en"));
export const getCurrencies = (locale: string) =>
	currencyList.getAll(locale) as Record<string, CurrencyDescription>;
export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
