import React from "react";
import * as ReactNative from "react-native";
import { trpc } from "../trpc";
import { Currency } from "../utils/currency";
import { CurrenciesPicker } from "./currencies-picker";
import { QueryWrapper } from "./utils/query-wrapper";

type Props = {
	initialCurrency: Currency;
	close: () => void;
	changeCurrency: (nextCurrency: Currency) => void;
};

export const ReceiptCurrencyChange: React.FC<Props> = ({
	initialCurrency,
	close,
	changeCurrency,
}) => {
	const [selectedCurrency, setSelectedCurrency] =
		React.useState(initialCurrency);
	const currenciesListQuery = trpc.useQuery([
		"currency.get-list",
		{ locale: "en" },
	]);
	return (
		<>
			<QueryWrapper
				query={currenciesListQuery}
				value={selectedCurrency}
				onChange={setSelectedCurrency}
			>
				{CurrenciesPicker}
			</QueryWrapper>
			<ReactNative.Button
				title={`Change to ${selectedCurrency}`}
				onPress={() => changeCurrency(selectedCurrency)}
			/>
			<ReactNative.Button title="Close" onPress={close} />
		</>
	);
};
