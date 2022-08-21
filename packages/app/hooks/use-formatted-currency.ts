import { trpc } from "app/trpc";
import { Currency } from "app/utils/currency";

export const useFormattedCurrency = (currency: Currency) => {
	const currenciesListQuery = trpc.useQuery(
		["currency.get-list", { locale: "en" }],
		{ ssr: false }
	);
	return currenciesListQuery.data
		? currenciesListQuery.data.list.find((element) => element.code === currency)
				?.symbol
		: currency;
};
