import type React from "react";

import { useTranslation } from "react-i18next";

import { useLocale } from "#app/hooks/use-locale.ts";
import { getCurrencySymbol } from "#app/utils/currency.ts";
import type { CurrencyCode } from "#app/utils/currency.ts";
import { Icon } from "#components/icons.tsx";
import { Text } from "#components/text.tsx";
import { cn } from "#components/utils.ts";
import { View } from "#components/view.tsx";

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
				{t("peer.even", { currency: getCurrencySymbol(locale, currencyCode) })}
			</Text>
		</View>
	);
};
