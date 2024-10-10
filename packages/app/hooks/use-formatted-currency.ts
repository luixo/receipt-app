import { useCurrencies } from "~app/hooks/use-currencies";
import type { TRPCQueryOutput } from "~app/trpc";
import type { CurrencyCode } from "~app/utils/currency";

export const getFormattedCurrency = (
	currencyCode: CurrencyCode,
	matchedCurrency?: TRPCQueryOutput<"currency.getList">[number],
) => {
	if (matchedCurrency) {
		return {
			symbol: matchedCurrency.symbol,
			name: matchedCurrency.name,
		};
	}
	return {
		symbol: currencyCode,
		name: currencyCode,
	};
};

export const useFormattedCurrency = (currencyCode: CurrencyCode) => {
	const currenciesListQuery = useCurrencies();
	return getFormattedCurrency(
		currencyCode,
		currenciesListQuery.data?.find((element) => element.code === currencyCode),
	);
};

export const useFormattedCurrencies = (currencyCodes: CurrencyCode[]) => {
	const currenciesListQuery = useCurrencies();
	return currencyCodes.map((currencyCode) =>
		getFormattedCurrency(
			currencyCode,
			currenciesListQuery.data?.find(
				(element) => element.code === currencyCode,
			),
		),
	);
};
