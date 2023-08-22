import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";

export const useFormattedCurrencies = (currencyCodes: CurrencyCode[]) => {
	const currenciesListQuery = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false } },
	);
	return currenciesListQuery.data
		? currencyCodes.map(
				(currencyCode) =>
					currenciesListQuery.data.find(
						(element) => element.code === currencyCode,
					)?.symbol,
		  )
		: currencyCodes;
};
