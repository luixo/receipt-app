import React from "react";
import { Picker } from "@react-native-picker/picker";
import { TRPCQueryOutput } from "../trpc";
import { Currency } from "../utils/currency";

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
}) => {
	return (
		<Picker selectedValue={value} onValueChange={onChange} onBlur={onBlur}>
			{data.map((currency) => {
				return (
					<Picker.Item
						key={currency.code}
						label={currency.name}
						value={currency.code}
					/>
				);
			})}
		</Picker>
	);
};
