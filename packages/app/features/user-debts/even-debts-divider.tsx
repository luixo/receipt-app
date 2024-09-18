import type React from "react";
import { View } from "react-native";

import { useFormattedCurrency } from "~app/hooks/use-formatted-currency";
import type { CurrencyCode } from "~app/utils/currency";
import { CheckMark } from "~components/icons";

type Props = {
	currencyCode: CurrencyCode;
};

export const EvenDebtsDivider: React.FC<Props> = ({ currencyCode }) => {
	const currency = useFormattedCurrency(currencyCode);
	return (
		<View
			className="flex flex-row items-center justify-center gap-2"
			testID="even-debts-divider"
		>
			<CheckMark size={24} className="text-success" />
			Even on {currency}
		</View>
	);
};
