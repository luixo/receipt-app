import { useCurrencies } from "~app/hooks/use-currencies";
import { useLocale } from "~app/hooks/use-locale";
import type { TRPCQueryOutput } from "~app/trpc";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import type { Locale } from "~app/utils/locale";

export const getCurrencyDescription = (
	locale: Locale,
	currencyCode: CurrencyCode,
	currenciesData?: TRPCQueryOutput<"currency.getList">,
) => {
	const currencySymbol = getCurrencySymbol(locale, currencyCode);
	if (!currenciesData) {
		return currencySymbol;
	}
	const matchedCurrency = currenciesData.find(
		(element) => element.code === currencyCode,
	);
	if (!matchedCurrency) {
		return currencySymbol;
	}
	return `${matchedCurrency.name} (${
		currencySymbol === matchedCurrency.code
			? currencySymbol
			: `${currencySymbol} / ${matchedCurrency.code}`
	})`;
};

export const useCurrencyDescription = (currencyCode: CurrencyCode) => {
	const currenciesListQuery = useCurrencies();
	const locale = useLocale();
	return getCurrencyDescription(locale, currencyCode, currenciesListQuery.data);
};

export const useCurrencyDescriptions = (currencyCodes: CurrencyCode[]) => {
	const currenciesListQuery = useCurrencies();
	const locale = useLocale();
	return currencyCodes.map((currencyCode) => ({
		code: currencyCode,
		description: getCurrencyDescription(
			locale,
			currencyCode,
			currenciesListQuery.data,
		),
	}));
};
