import type React from "react";
import { View } from "react-native";

import { useLocale } from "~app/hooks/use-locale";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { CheckMark } from "~components/icons";
import { Text } from "~components/text";

type Props = {
	currencyCode: CurrencyCode;
};

export const EvenDebtsDivider: React.FC<Props> = ({ currencyCode }) => {
	const locale = useLocale();
	return (
		<View
			className="flex flex-row items-center justify-center gap-2"
			testID="even-debts-divider"
		>
			<CheckMark size={24} className="text-success" />
			<Text>Even on {getCurrencySymbol(locale, currencyCode)}</Text>
		</View>
	);
};
