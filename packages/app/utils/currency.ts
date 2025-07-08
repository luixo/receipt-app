import type { z } from "zod/v4";

import type { Locale } from "~app/utils/locale";
import type { currencySchema } from "~app/utils/validation";
import { capitalize } from "~utils/string";

export type CurrencyCode = string & {
	__flavor?: "currencyCode";
};

export type Currency = z.infer<typeof currencySchema>;

export const formatCurrency = (
	locale: Locale,
	currencyCode: CurrencyCode,
	value: number,
) =>
	new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currencyCode,
	}).format(value);

export const getCurrencySymbol = (
	locale: Locale,
	currencyCode: CurrencyCode,
) => {
	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency: currencyCode,
	});
	const parts = formatter.formatToParts(0);
	const symbolPart = parts.find((part) => part.type === "currency");
	return symbolPart?.value ?? currencyCode;
};

export const getCurrencyDescription = (
	locale: Locale,
	currencyCode: CurrencyCode,
) => {
	const currencySymbol = getCurrencySymbol(locale, currencyCode);
	const displayName = new Intl.DisplayNames(locale, { type: "currency" }).of(
		currencyCode,
	);
	const symbol =
		currencySymbol === currencyCode
			? currencySymbol
			: `${currencySymbol} / ${currencyCode}`;
	if (!displayName) {
		return symbol;
	}
	if (displayName === symbol) {
		return displayName;
	}
	return `${capitalize(displayName)} (${symbol})`;
};
