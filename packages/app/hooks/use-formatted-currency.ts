import { trpc } from "app/trpc";
import type { CurrencyCode } from "app/utils/currency";

export const useFormattedCurrency = (currencyCode?: CurrencyCode) => {
	const currenciesListQuery = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false } },
	);
	return (
		(currenciesListQuery.data
			? currenciesListQuery.data.find(
					(element) => element.code === currencyCode,
			  )?.symbol
			: currencyCode) ?? "???"
	);
};
