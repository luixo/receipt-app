import { trpc } from "app/trpc";
import { Currency } from "app/utils/currency";

export const useFormattedCurrency = (currency?: Currency) => {
	const currenciesListQuery = trpc.currency.getList.useQuery(
		{ locale: "en" },
		{ trpc: { ssr: false } }
	);
	return currenciesListQuery.data
		? currenciesListQuery.data.find((element) => element.code === currency)
				?.symbol
		: currency;
};
