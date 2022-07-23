import React from "react";
import * as ReactNative from "react-native";

import { CurrenciesPicker } from "app/components/currencies-picker";
import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";

type Props = {
	initialCurrency: Currency;
	close: () => void;
	changeCurrency: (nextCurrency: Currency) => void;
	disabled?: boolean;
};

export const ReceiptCurrencyChange: React.FC<Props> = ({
	initialCurrency,
	close,
	changeCurrency,
	disabled,
}) => {
	const [selectedCurrency, setSelectedCurrency] = React.useState<
		TRPCQueryOutput<"currency.get-list">[number] | undefined
	>();
	const [currencyModalOpen, setCurrencyModalOpen] = React.useState(false);
	const switchCurrencyModal = React.useCallback(
		() => setCurrencyModalOpen((prev) => !prev),
		[setCurrencyModalOpen]
	);
	return (
		<>
			<CurrenciesPicker
				initialCurrencyCode={initialCurrency}
				selectedCurrency={selectedCurrency}
				onChange={setSelectedCurrency}
				modalOpen={currencyModalOpen}
				onModalClose={switchCurrencyModal}
			/>
			<ReactNative.Button
				title={`Change to ${selectedCurrency}`}
				onPress={
					selectedCurrency
						? () => changeCurrency(selectedCurrency.code)
						: undefined
				}
				disabled={disabled}
			/>
			<ReactNative.Button title="Close" onPress={close} />
		</>
	);
};
