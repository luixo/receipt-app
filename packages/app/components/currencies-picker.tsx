import React from "react";

import { Picker } from "@react-native-picker/picker";

import { TRPCQueryOutput } from "app/trpc";
import { Currency } from "app/utils/currency";

type Props = {
	data: TRPCQueryOutput<"currency.get-list">;
	value: Currency;
	onChange: (nextCurrency: Currency) => void;
	onBlur?: () => void;
};

export const CurrenciesPicker: React.FC<Props> = ({
	data,
	value,
	onChange,
	onBlur,
}) => (
	<Picker selectedValue={value} onValueChange={onChange} onBlur={onBlur}>
		{data.map((currency) => (
			<Picker.Item
				key={currency.code}
				label={currency.name}
				value={currency.code}
			/>
		))}
	</Picker>
);
