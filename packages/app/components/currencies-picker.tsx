import React from "react";
import { Picker } from "@react-native-picker/picker";
import { TRPCQueryOutput } from "../trpc";
import { Currency } from "../utils/currency";

type Props = {
	data: TRPCQueryOutput<"currency.get-list">;
	controllerProps: ControllerRenderProps<
		{ currency: Currency; name: string },
		"currency"
	>;
};

export const CurrenciesPicker: React.FC<Props> = ({
	data,
	controllerProps,
}) => {
	return (
		<Picker
			selectedValue={controllerProps.value}
			onValueChange={controllerProps.onChange}
			onBlur={controllerProps.onBlur}
		>
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
