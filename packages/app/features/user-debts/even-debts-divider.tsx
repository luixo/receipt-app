import type React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { useLocale } from "~app/hooks/use-locale";
import { type CurrencyCode, getCurrencySymbol } from "~app/utils/currency";
import { Icon } from "~components/icons";
import { Text } from "~components/text";
import { cn } from "~components/utils";

type Props = {
	currencyCode: CurrencyCode;
} & React.ComponentProps<typeof View>;

export const EvenDebtsDivider: React.FC<Props> = ({
	currencyCode,
	className,
	...props
}) => {
	const { t } = useTranslation("debts");
	const locale = useLocale();
	return (
		<View
			className={cn(
				"flex flex-row items-center justify-center gap-2",
				className,
			)}
			testID="even-debts-divider"
			{...props}
		>
			<Icon name="check" className="text-success size-6" />
			<Text>
				{t("user.even", { currency: getCurrencySymbol(locale, currencyCode) })}
			</Text>
		</View>
	);
};
