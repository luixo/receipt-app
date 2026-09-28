import { capitalize } from "remeda";
import type { z } from "zod";

import type { Locale } from "~app/utils/locale";
import type { currencySchema } from "~app/utils/validation";

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

// see https://issues.chromium.org/issues/566540087
const FALLBACK_CODES: Partial<Record<CurrencyCode, string>> = {
	SLE: "Sierra Leonean Leone (SLE)",
	XCG: "Caribbean guilder (Cg. / XCG)",
	ZWG: "Zimbabwean Gold (ZWG)",
};

export const getCurrencyDescription = (
	locale: Locale,
	currencyCode: CurrencyCode,
) => {
	const currencySymbol = getCurrencySymbol(locale, currencyCode);
	const displayName = new Intl.DisplayNames(locale, {
		type: "currency",
		fallback: "none",
	}).of(currencyCode);
	const symbol =
		currencySymbol === currencyCode
			? currencySymbol
			: `${currencySymbol} / ${currencyCode}`;
	if (!displayName) {
		if (FALLBACK_CODES[currencyCode]) {
			return FALLBACK_CODES[currencyCode];
		}
		return symbol;
	}
	if (displayName === symbol) {
		return displayName;
	}
	return `${capitalize(displayName)} (${symbol})`;
};
