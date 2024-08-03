import currencyList from "currency-list";
import { keys } from "remeda";

import type { CurrencyCode } from "~app/utils/currency";

type CurrencyDescription = ReturnType<typeof currencyList.get>;
export const CURRENCY_CODES = keys(currencyList.getAll("en"));
export const getCurrencies = (locale: string) =>
	currencyList.getAll(locale) as
		| Record<string, CurrencyDescription>
		| undefined;
export const isCurrencyCode = (input: string): input is CurrencyCode =>
	CURRENCY_CODES.includes(input);
